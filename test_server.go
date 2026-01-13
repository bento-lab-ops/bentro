package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello from Windows Host!")
	})
	fmt.Println("Starting server on :9090")
	http.ListenAndServe(":9090", nil)
}
