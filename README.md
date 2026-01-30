# BenTro 🍱



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
- **Real-time Sync**: Redis (Optional, for multi-pod scaling) or In-Memory (Single instance)
- **Infrastructure**: Docker & Kubernetes

## 🚀 Deployment (Recommended: Helm)

The recommended way to deploy BenTro is using **Helm**. This ensures all dependencies (PostgreSQL, Redis) and SSL certificates are configured correctly.

### Prerequisites
- Kubernetes Cluster (v1.24+)
- Helm (v3.0+)
- `kubectl` configured

### Installation (Recommended)

1. **Install from DockerHub (OCI)**:
   This is the easiest method. No cloning required.
   ```bash
   helm install bentro oci://registry-1.docker.io/dnlouko/bentro-app --version 0.1.0 \
     --namespace bentro \
     --create-namespace
   ```

### Installation (Local Dev)
If you have cloned the repository:

1. **Install/Upgrade Release**:
   ```bash
   helm upgrade --install bentro ./helm/bentro-chart \
     --namespace bentro \
     --create-namespace
   ```

3. **Verify Deployment**:
   ```bash
   kubectl get pods -n bentro
   kubectl get ingress -n bentro
   ```

### Configuration (`values.yaml`)
The default configuration ("Happy Path") deploys:
- **App**: 2 Replicas
- **Database**: PostgreSQL container (with persistent storage)
- **Cache**: Redis container
- **SSL**: Auto-provisioned via `cert-manager` (requires cluster Issuer)

To assume a custom database or external services, check `helm/bentro-chart/values.yaml` for `enabled: false` options.

---

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
| `REDIS_ADDR` | Redis Address | `localhost:6379` (Optional) |

> **Note on Redis**: BenTro works out-of-the-box without Redis (using in-memory synchronization). Redis is **only required** if you deploy multiple replicas (pods) of the application to sync state between them.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
99: [No Change]

## 🔧 Troubleshooting

### Frontend Debugging

By default, the browser console is silent (logs are suppressed). To enable verbose logging for troubleshooting:

1.  Open your browser's Developer Tools (F12).
2.  Go to the **Console** tab.
3.  Run the following command:
    ```javascript
    localStorage.setItem('DEBUG', 'true')
    ```
4.  Reference the page (F5). You should see `[DEBUG] Logger Active` and all subsequent logs.

To disable:
```javascript
localStorage.removeItem('DEBUG')
```
