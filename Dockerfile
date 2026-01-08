# Multi-stage build
FROM golang:1.24-alpine AS builder

WORKDIR /app
ENV CACHE_BUST=v6

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy force update file to bust cache
COPY FORCE_UPDATE .

# Copy source code
COPY . .
RUN ls -la internal/database/
RUN ls -la cmd/server/
RUN cat cmd/server/main.go

# Build the application
ARG TARGETARCH
# Force rebuild with unique binary name
RUN ls -la internal/database/
RUN ls -la cmd/server/
RUN cat cmd/server/main.go
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -a -installsuffix cgo -o bentro-final-v4 ./cmd/server

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
