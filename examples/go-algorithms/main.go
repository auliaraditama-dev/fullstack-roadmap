package main

import (
	"fmt"
	"sort"
)

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

func average(numbers []int) (float64, bool) {
	if len(numbers) == 0 {
		return 0, false
	}
	total := 0
	for _, number := range numbers {
		total += number
	}
	return float64(total) / float64(len(numbers)), true
}

func maxValue(numbers []int) (int, bool) {
	if len(numbers) == 0 {
		return 0, false
	}
	largest := numbers[0]
	for _, number := range numbers[1:] {
		if number > largest {
			largest = number
		}
	}
	return largest, true
}

func secondLargest(numbers []int) (int, bool) {
	if len(numbers) < 2 {
		return 0, false
	}
	unique := make(map[int]struct{}, len(numbers))
	for _, number := range numbers {
		unique[number] = struct{}{}
	}
	if len(unique) < 2 {
		return 0, false
	}
	values := make([]int, 0, len(unique))
	for number := range unique {
		values = append(values, number)
	}
	sort.Ints(values)
	return values[len(values)-2], true
}

func main() {
	numbers := []int{12, 8, 25, 10, 15}
	avg, _ := average(numbers)
	largest, _ := maxValue(numbers)
	second, _ := secondLargest(numbers)
	fmt.Println("Prima 17:", isPrime(17))
	fmt.Printf("Rata-rata: %.2f\n", avg)
	fmt.Println("Terbesar:", largest)
	fmt.Println("Terbesar kedua:", second)
}
