package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type config struct {
	Address     string
	DatabaseURL string
	CORSOrigin  string
}

func loadConfig() (config, error) {
	appEnv := env("APP_ENV", "development")
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		if appEnv == "production" {
			return config{}, errors.New("DATABASE_URL wajib diisi pada APP_ENV=production")
		}
		databaseURL = "postgres://app:local-development-only@127.0.0.1:5432/tasktracker?sslmode=disable"
	}

	return config{
		Address:     env("HTTP_ADDR", ":8080"),
		DatabaseURL: databaseURL,
		CORSOrigin:  env("CORS_ORIGIN", "http://127.0.0.1:5173"),
	}, nil
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatal(err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	if err := db.Ping(ctx); err != nil {
		log.Fatal(err)
	}

	application := &app{db: db, corsOrigin: cfg.CORSOrigin}
	server := &http.Server{
		Addr:              cfg.Address,
		Handler:           application.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("api listening on %s", cfg.Address)
		errCh <- server.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("graceful shutdown gagal: %v", err)
		}
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(fmt.Errorf("server berhenti: %w", err))
		}
	}
}
