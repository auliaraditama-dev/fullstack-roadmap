package main

import (
	"context"
	"errors"
	"net/http"
	"time"

	"example.com/task-tracker/backend/internal/task"
	"github.com/jackc/pgx/v5"
)

func (a *app) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := a.db.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *app) list(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(r.Context(), `SELECT id,title,done,created_at,updated_at FROM tasks ORDER BY created_at DESC, id DESC`)
	if err != nil {
		serverError(w)
		return
	}
	defer rows.Close()

	items := make([]task.Task, 0)
	for rows.Next() {
		var item task.Task
		if err := rows.Scan(&item.ID, &item.Title, &item.Done, &item.CreatedAt, &item.UpdatedAt); err != nil {
			serverError(w)
			return
		}
		items = append(items, item)
	}
	if rows.Err() != nil {
		serverError(w)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *app) create(w http.ResponseWriter, r *http.Request) {
	var input writeTask
	if !decodeJSON(w, r, &input) {
		return
	}
	if input.Title == nil {
		http.Error(w, "title wajib diisi", http.StatusBadRequest)
		return
	}
	title, err := validateTitle(*input.Title)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var item task.Task
	err = a.db.QueryRow(
		r.Context(),
		`INSERT INTO tasks(title) VALUES($1) RETURNING id,title,done,created_at,updated_at`,
		title,
	).Scan(&item.ID, &item.Title, &item.Done, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		serverError(w)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (a *app) update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r.PathValue("id"))
	if !ok {
		return
	}

	var input writeTask
	if !decodeJSON(w, r, &input) {
		return
	}
	if input.Title == nil && input.Done == nil {
		http.Error(w, "tidak ada perubahan", http.StatusBadRequest)
		return
	}

	var title any
	if input.Title != nil {
		validated, err := validateTitle(*input.Title)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		title = validated
	}

	var item task.Task
	err := a.db.QueryRow(
		r.Context(),
		`UPDATE tasks SET title=COALESCE($2,title), done=COALESCE($3,done), updated_at=NOW() WHERE id=$1 RETURNING id,title,done,created_at,updated_at`,
		id, title, input.Done,
	).Scan(&item.ID, &item.Title, &item.Done, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		serverError(w)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (a *app) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r.PathValue("id"))
	if !ok {
		return
	}
	result, err := a.db.Exec(r.Context(), `DELETE FROM tasks WHERE id=$1`, id)
	if err != nil {
		serverError(w)
		return
	}
	if result.RowsAffected() == 0 {
		http.NotFound(w, r)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
