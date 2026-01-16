# Simplified Dockerfile for Local Build Strategy
FROM alpine:latest

WORKDIR /root/

# Copy cross-compiled binary
COPY bentro-server-linux ./bentro-final-v4

# Prepare web distribution
RUN mkdir -p web/dist

# Copy web assets to dist (mirroring the node-builder logic)
COPY web/public/ web/dist/
COPY web/js/ web/dist/js/
COPY web/css/ web/dist/css/
COPY web/bentro.css web/dist/
COPY web/index.html web/dist/

# Create assets dir just in case
RUN mkdir -p web/dist/assets

EXPOSE 8080

CMD ["./bentro-final-v4"]
