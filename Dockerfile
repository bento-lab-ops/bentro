# Multi-stage build
FROM golang:1.24-alpine AS builder

WORKDIR /app
ENV CACHE_BUST=v0.10.57

# Copy source code
COPY . .
RUN go mod tidy

# Build the application
# Explicitly building for ARM64
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -a -installsuffix cgo -o bentro-final-v4 ./cmd/server

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/bentro-final-v4 .

# Copy web files (cache bust: final-v4)
COPY --from=builder /app/web ./web

EXPOSE 8080

CMD ["./bentro-final-v4"]
