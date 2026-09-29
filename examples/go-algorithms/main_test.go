package main

import "testing"

func TestIsPrime(t *testing.T) {
	tests := []struct {
		input int
		want  bool
	}{{-1, false}, {0, false}, {1, false}, {2, true}, {4, false}, {17, true}, {49, false}}
	for _, tc := range tests {
		if got := isPrime(tc.input); got != tc.want {
			t.Fatalf("isPrime(%d) = %v, want %v", tc.input, got, tc.want)
		}
	}
}

func TestAverageEmpty(t *testing.T) {
	if _, ok := average(nil); ok {
		t.Fatal("average(nil) must be invalid")
	}
}

func TestMaxNegative(t *testing.T) {
	got, ok := maxValue([]int{-10, -3, -20})
	if !ok || got != -3 {
		t.Fatalf("maxValue() = %d, %v; want -3, true", got, ok)
	}
}
