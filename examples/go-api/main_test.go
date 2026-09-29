package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	res := httptest.NewRecorder()
	routes().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status = %d", res.Code)
	}
}

func TestAverage(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/average", strings.NewReader(`{"numbers":[10,20,30]}`))
	res := httptest.NewRecorder()
	routes().ServeHTTP(res, req)
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"average":20`) {
		t.Fatalf("unexpected response: %d %s", res.Code, res.Body.String())
	}
}
