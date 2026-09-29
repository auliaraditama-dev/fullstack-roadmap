package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func jsonRequest(method, target, body string) *http.Request {
	r := httptest.NewRequest(method, target, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	return r
}

func TestParseID(t *testing.T) {
	for _, tc := range []struct {
		raw  string
		want bool
	}{{"1", true}, {"42", true}, {"0", false}, {"-2", false}, {"abc", false}} {
		w := httptest.NewRecorder()
		_, ok := parseID(w, tc.raw)
		if ok != tc.want {
			t.Fatalf("parseID(%q) ok=%v want=%v", tc.raw, ok, tc.want)
		}
	}
}

func TestValidateTitleUsesCharactersNotBytes(t *testing.T) {
	if _, err := validateTitle(strings.Repeat("é", 200)); err != nil {
		t.Fatalf("200 karakter unicode ditolak: %v", err)
	}
	if _, err := validateTitle(strings.Repeat("é", 201)); err == nil {
		t.Fatal("201 karakter unicode diterima")
	}
}

func TestDecodeJSONRejectsUnknownField(t *testing.T) {
	r := jsonRequest(http.MethodPost, "/api/tasks", `{"title":"Belajar Go","unexpected":true}`)
	w := httptest.NewRecorder()
	var input writeTask
	if decodeJSON(w, r, &input) {
		t.Fatal("decodeJSON accepted unknown field")
	}
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d", w.Code, http.StatusBadRequest)
	}
}

func TestDecodeJSONRejectsMultipleObjects(t *testing.T) {
	r := jsonRequest(http.MethodPost, "/api/tasks", `{"title":"Satu"}{"title":"Dua"}`)
	w := httptest.NewRecorder()
	var input writeTask
	if decodeJSON(w, r, &input) {
		t.Fatal("decodeJSON accepted multiple JSON objects")
	}
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d", w.Code, http.StatusBadRequest)
	}
}

func TestDecodeJSONRequiresJSONContentType(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/api/tasks", strings.NewReader(`{"title":"Belajar"}`))
	w := httptest.NewRecorder()
	var input writeTask
	if decodeJSON(w, r, &input) {
		t.Fatal("decodeJSON accepted missing Content-Type")
	}
	if w.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status=%d want=%d", w.Code, http.StatusUnsupportedMediaType)
	}
}

func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	h := cors("http://127.0.0.1:5173", http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Origin", "http://127.0.0.1:5173")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://127.0.0.1:5173" {
		t.Fatalf("Access-Control-Allow-Origin=%q", got)
	}
}

func TestCORSRejectsForeignPreflight(t *testing.T) {
	h := cors("http://127.0.0.1:5173", http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	r := httptest.NewRequest(http.MethodOptions, "/api/tasks", nil)
	r.Header.Set("Origin", "https://example.invalid")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != http.StatusForbidden {
		t.Fatalf("status=%d want=%d", w.Code, http.StatusForbidden)
	}
}

func TestSecureHeaders(t *testing.T) {
	h := secureHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
	for key, want := range map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"Referrer-Policy":        "no-referrer",
	} {
		if got := w.Header().Get(key); got != want {
			t.Fatalf("%s=%q want=%q", key, got, want)
		}
	}
}
