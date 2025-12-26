# Multi-stage build
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy force update file to bust cache
COPY FORCE_UPDATE .

# Copy source code
COPY . .

# Build the application
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -a -installsuffix cgo -o main ./cmd/server

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/main .

# Copy web files (cache bust: 2025-11-26-07:30)
COPY --from=builder /app/web ./web

EXPOSE 8080

CMD ["./main"]
