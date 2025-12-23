# BenTro 🍱

![BenTro Logo](web/bentrologo.png)

**BenTro** (Bento + Retro) is a lightweight, real-time retrospective tool designed for agile teams. It combines the simplicity of a bento box with powerful collaboration features.

![BenTro Dashboard](https://github.com/bento-lab-ops/bentro/raw/main/docs/dashboard-preview.png)

## 🚀 Features

- **Real-time Collaboration**: See cards move and votes update instantly (powered by WebSockets).
- **Multiple Boards**: Manage retrospectives for different sprints or teams.
- **Customizable Templates**:
  - Start/Stop/Continue
  - Mad/Sad/Glad
  - 4Ls (Liked, Learned, Lacked, Longed For)
  - Sailboat (Wind, Anchor, Rocks, Island)
  - **Custom**: Define your own columns!
- **Phased Retrospectives**:
  - **Input**: Add cards privately or publicly.
  - **Vote**: Anonymous voting on cards.
  - **Discuss**: Timer-boxed discussion phase.
- **Card Merging**: Group similar ideas to declutter the board.
- **Export**: Download your retrospective data as CSV.
- **Mobile Friendly**: Responsive design for participation on the go.

## 🛠️ Tech Stack

- **Backend**: Go (Golang) with Gin framework
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (No heavy frameworks)
- **Database**: PostgreSQL
- **Infrastructure**: Docker & Kubernetes

## 📦 Installation

### Prerequisites

- Docker
- Kubernetes Cluster (Minikube, Kind, or Cloud Provider)
- `kubectl` configured

### Quick Start (Kubernetes)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/bento-lab-ops/bentro.git
    cd bentro
    ```

2.  **Deploy to Kubernetes:**
    ```bash
    # Create namespace
    kubectl create namespace bentro

    # Apply manifests
    kubectl apply -f k8s/configmap.yaml -n bentro
    kubectl apply -f k8s/secret.yaml -n bentro
    kubectl apply -f k8s/postgres-pv.yaml
    kubectl apply -f k8s/pvc.yaml -n bentro
    kubectl apply -f k8s/postgres-deployment.yaml -n bentro
    kubectl apply -f k8s/deployment.yaml -n bentro
    kubectl apply -f k8s/service.yaml -n bentro
    kubectl apply -f k8s/ingress.yaml -n bentro
    ```

3.  **Access the App:**
    - If using Ingress, access via your configured host (e.g., `http://bentro.local`).
    - Or port-forward for local testing:
      ```bash
      kubectl port-forward svc/bentro-app-service 8080:80 -n bentro
      ```
      Access at `http://localhost:8080`.

## ⚙️ Configuration

The application is configured via Environment Variables (defined in `k8s/configmap.yaml` and `k8s/secret.yaml`):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DB_HOST` | PostgreSQL Host | `postgres-service` |
| `DB_PORT` | PostgreSQL Port | `5432` |
| `DB_USER` | Database User | `retro_user` |
| `DB_NAME` | Database Name | `retro_db` |
| `DB_PASSWORD` | Database Password | *(Set in Secret)* |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
