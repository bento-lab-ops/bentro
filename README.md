# BenTro 🎯

![BenTro Logo](web/static/assets/images/bentrologo.png)

**Retrospectives, packed perfectly!**

*BenTro = Bento + Retrospective - A friendly retrospective tool that makes team collaboration effortless.*

---

## Features

- 🎯 **Customizable Boards**: Create multiple retrospective boards with custom column names
- 📝 **Card Management**: Add, edit, and delete cards with drag-and-drop functionality
- 🔄 **Drag & Drop**: Move cards between columns seamlessly
- 🔗 **Card Merging**: Select and merge similar cards together
- ⏱️ **Phase Timer**: Customizable countdown timer for each retrospective phase
- 👍 **Voting System**: Like/dislike cards during the voting phase
- 🔴 **Real-time Sync**: WebSocket-based synchronization across all clients
- 💾 **Persistent Storage**: PostgreSQL database for data persistence
- 🐳 **Containerized**: Docker and Kubernetes ready
- 🎨 **Modern UI**: Beautiful glassmorphism design with smooth animations
- 📊 **CSV Export**: Export your retrospective data for analysis

## Tech Stack

- **Backend**: Go 1.21+ with Gin web framework
- **Database**: PostgreSQL 15
- **Frontend**: Vanilla HTML/CSS/JavaScript with SortableJS
- **Real-time**: WebSockets
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes

## Quick Start with Docker Compose

### Prerequisites

- Docker and Docker Compose installed
- Go 1.21+ (for local development)

### Running Locally

1. Clone the repository and navigate to the project directory:

```bash
cd retro-app
```

2. Start the application with Docker Compose:

```bash
docker-compose up --build
```

3. Access the application at `http://localhost:8080`

4. To stop the application:

```bash
docker-compose down
```

To remove all data:

```bash
docker-compose down -v
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (minikube, kind, or cloud provider)
- kubectl configured to access your cluster
- Docker image built and available to your cluster

### Build and Load Docker Image

For local Kubernetes (minikube/kind):

```bash
# Build the Docker image
docker build -t retro-app:latest .

# For minikube
minikube image load retro-app:latest

# For kind
kind load docker-image retro-app:latest
```

For cloud providers, push to a container registry:

```bash
docker tag retro-app:latest your-registry/retro-app:latest
docker push your-registry/retro-app:latest
```

Then update `k8s/deployment.yaml` to use your image.

### Deploy to Kubernetes

1. Apply all Kubernetes manifests:

```bash
kubectl apply -f k8s/
```

2. Check deployment status:

```bash
kubectl get pods
kubectl get services
```

3. Get the external IP (for LoadBalancer):

```bash
kubectl get service retro-app-service
```

For minikube:

```bash
minikube service retro-app-service
```

4. Access the application using the external IP or minikube URL

### Kubernetes Resources

The deployment includes:

- **ConfigMap**: Non-sensitive configuration (database host, port, etc.)
- **Secret**: Database credentials (base64 encoded)
- **PersistentVolumeClaim**: 5Gi storage for PostgreSQL
- **PostgreSQL Deployment**: Single replica with persistent storage
- **PostgreSQL Service**: ClusterIP for internal communication
- **App Deployment**: 2 replicas with health checks
- **App Service**: LoadBalancer for external access

### Scaling

Scale the application:

```bash
kubectl scale deployment retro-app --replicas=3
```

### Updating

Update the application:

```bash
# Build new image
docker build -t retro-app:latest .

# Load to cluster (minikube/kind)
minikube image load retro-app:latest

# Restart deployment
kubectl rollout restart deployment retro-app
```

### Cleanup

Remove all resources:

```bash
kubectl delete -f k8s/
```

## Local Development

### Prerequisites

- Go 1.21+
- PostgreSQL 15
- Node.js (for frontend dependencies, optional)

### Setup

1. Install Go dependencies:

```bash
go mod download
```

2. Start PostgreSQL (or use Docker):

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=retrodb \
  -p 5432:5432 \
  postgres:15-alpine
```

3. Run the application:

```bash
go run cmd/server/main.go
```

4. Access at `http://localhost:8080`

## API Documentation

### Boards

- `POST /api/boards` - Create a new board
  ```json
  {
    "name": "Sprint 42 Retro",
    "columns": ["What Went Well", "Needs Attention", "What Went Badly", "Action Items"]
  }
  ```

- `GET /api/boards` - List all boards
- `GET /api/boards/:id` - Get board with columns and cards
- `DELETE /api/boards/:id` - Delete a board

### Columns

- `POST /api/boards/:boardId/columns` - Create a column
- `PUT /api/columns/:id` - Update column name
- `PUT /api/columns/:id/position` - Update column position
- `DELETE /api/columns/:id` - Delete a column

### Cards

- `POST /api/columns/:columnId/cards` - Create a card
- `PUT /api/cards/:id` - Update card content
- `PUT /api/cards/:id/move` - Move card to different column
- `POST /api/cards/:id/merge` - Merge card with another
- `DELETE /api/cards/:id` - Delete a card

### Votes

- `POST /api/cards/:cardId/votes` - Add a vote (like/dislike)
- `GET /api/cards/:cardId/votes` - Get vote counts
- `DELETE /api/votes/:id` - Remove a vote

### WebSocket

- `WS /ws` - WebSocket connection for real-time updates

## Usage Guide

### Creating a Board

1. Click "New Board" button
2. Enter board name
3. Optionally customize column names (one per line)
4. Click "Create Board"

### Input Phase

1. Select a board from the dropdown
2. Set timer duration in minutes
3. Click "Start Timer"
4. Team members add cards to columns
5. Drag and drop cards between columns
6. Merge similar cards by dragging one onto another

### Voting Phase

1. Click "Switch to Voting" button
2. Set timer for voting duration
3. Team members vote on cards using 👍 or 👎
4. View vote counts on each card

### Managing Columns

- Click ✏️ to rename a column
- Click 🗑️ to delete a column
- Click "+ Add Column" to create a new column

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_NAME` | Database name | `retrodb` |

## Project Structure

```
retro-app/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── database/
│   │   └── database.go          # Database connection
│   ├── handlers/
│   │   ├── board_handler.go     # Board API handlers
│   │   ├── card_handler.go      # Card API handlers
│   │   ├── column_handler.go    # Column API handlers
│   │   ├── vote_handler.go      # Vote API handlers
│   │   └── websocket_handler.go # WebSocket handler
│   └── models/
│       └── models.go            # GORM models
├── k8s/
│   ├── configmap.yaml           # Kubernetes ConfigMap
│   ├── secret.yaml              # Kubernetes Secret
│   ├── pvc.yaml                 # PersistentVolumeClaim
│   ├── postgres-deployment.yaml # PostgreSQL Deployment
│   ├── postgres-service.yaml    # PostgreSQL Service
│   ├── deployment.yaml          # App Deployment
│   └── service.yaml             # App Service
├── web/
│   ├── index.html               # Main HTML
│   ├── styles.css               # Styles
│   └── app.js                   # Frontend JavaScript
├── Dockerfile                   # Docker build
├── docker-compose.yml           # Docker Compose config
├── go.mod                       # Go dependencies
└── README.md                    # This file
```

## Troubleshooting

### Database Connection Issues

Check PostgreSQL is running:

```bash
docker ps | grep postgres
```

Check logs:

```bash
docker logs retro-postgres
```

### Kubernetes Pod Issues

Check pod status:

```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### WebSocket Connection Issues

Ensure your firewall/load balancer supports WebSocket connections. For cloud providers, you may need to configure ingress with WebSocket support.

## Future Features

We have exciting features planned for BenTro! Check out our [FUTURE_FEATURES.md](FUTURE_FEATURES.md) for detailed roadmap including:

- 👥 Multi-team support
- 🌍 Internationalization (Portuguese pt-BR)
- ⚙️ Admin settings panel
- 📋 Card templates
- ✅ Action items tracking
- ⌨️ Keyboard shortcuts
- And much more!

## License

MIT License - feel free to use this for your team's retrospectives!
