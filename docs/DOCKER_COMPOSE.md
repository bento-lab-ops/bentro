# Running with Docker Compose 🐳

For local testing or simple deployments without Kubernetes, you can use Docker Compose.

1.  Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: retro-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: retrodb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U postgres" ]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    # Use the specific architecture version if needed, or the manifest tag if available
    image: dnlouko/bentro-app:v0.15.4-amd64 # Or -arm64 for Raspberry Pi
    container_name: retro-app
    ports:
      - "8081:8080" # Access at http://localhost:8081
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_NAME: retrodb
      JWT_SECRET: "change_this_secret_locally"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

2.  Run commands:
    ```bash
    # Start
    docker compose up -d

    # Stop
    docker compose down
    ```
