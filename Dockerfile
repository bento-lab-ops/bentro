# Multi-stage build
# Node.js Build Stage
FROM --platform=$BUILDPLATFORM node:18-slim AS node-builder
WORKDIR /web
ARG CACHE_BUST_NODE=1
COPY web/package.json ./
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Install dependencies
RUN npm install
# Copy web source
COPY web/ .
# Manual "Build" - Copy specific source files to dist
RUN mkdir dist && cp -r public/* dist/ && cp -r js dist/ && cp index.html dist/ && cp bentro.css dist/ && cp -r css dist/
# Build
# RUN npm run build
RUN echo "Skipped build, serving raw files"

# Go Builder Stage
FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS go-builder
WORKDIR /app
ENV CACHE_BUST=v0.15.4

# Copy source code
COPY . .
RUN go mod tidy

# Build the application
# Build with dynamic architecture support
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -a -installsuffix cgo -o bentro-final-v4 ./cmd/server

# Runtime stage
FROM alpine:latest

# RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=go-builder /app/bentro-final-v4 .

# Copy web/dist files from node-builder
COPY --from=node-builder /web/dist ./web/dist

EXPOSE 8080

CMD ["./bentro-final-v4"]
