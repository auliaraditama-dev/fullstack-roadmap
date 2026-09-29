package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type averageRequest struct {
	Numbers []int `json:"numbers"`
}

type primeRequest struct {
	Number int `json:"number"`
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func isPrime(n int) bool {
	if n < 2 {
		return false
	}
	for i := 2; i*i <= n; i++ {
		if n%i == 0 {
			return false
		}
	}
	return true
}

func health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func averageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var input averageRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&input); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if len(input.Numbers) == 0 {
		http.Error(w, "numbers wajib diisi", http.StatusBadRequest)
		return
	}
	total := 0
	for _, number := range input.Numbers {
		total += number
	}
	writeJSON(w, http.StatusOK, map[string]float64{"average": float64(total) / float64(len(input.Numbers))})
}

func primeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var input primeRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&input); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"prime": isPrime(input.Number)})
}

func routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", health)
	mux.HandleFunc("POST /api/average", averageHandler)
	mux.HandleFunc("POST /api/prime", primeHandler)
	return mux
}

func main() {
	server := &http.Server{Addr: ":8080", Handler: routes(), ReadHeaderTimeout: 5e9}
	log.Println("listening on http://127.0.0.1:8080")
	log.Fatal(server.ListenAndServe())
}
