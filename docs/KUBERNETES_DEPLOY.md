# Kubernetes Deployment Guide 🚀

This guide explains how to deploy **BenTro** to a Kubernetes cluster. It covers application deployment, configuration management via Environment Variables, and flexible database integration strategies.

---

## 📋 Prerequisites

- A running **Kubernetes Cluster** (local or cloud).
- **kubectl** CLI tool configured to talk to your cluster.
- (Optional) **nerdctl** or **docker** if you need to build custom images.

---

## ⚙️ Environment Variables

The application relies on the following environment variables for configuration. These should be defined in your `deployment.yaml`, `ConfigMap`, or `Secret`.

| Variable | Description | Default | Required? |
| :--- | :--- | :--- | :--- |
| **`DB_HOST`** | Hostname or IP of the PostgreSQL database. | `localhost` | ✅ Yes (Prod) |
| **`DB_PORT`** | Port of the PostgreSQL database. | `5432` | ✅ Yes |
| **`DB_USER`** | Database username. | `postgres` | ✅ Yes |
| **`DB_PASSWORD`** | Database password. | `postgres` | ✅ Yes |
| **`DB_NAME`** | Database name. | `retrodb` | ✅ Yes |
| **`JWT_SECRET`** | Secret key for signing Session Tokens. **Change this!** | - | ✅ Yes |
| **`ADMIN_PASSWORD`** | Initial password for the `admin` user. | `bentro` | ❌ No |
| **`DB_DRIVER`** | Database driver. Use `postgres` for K8s. | `postgres` | ❌ No |
| **`LOCAL_DEV`** | Set to "true" only for local dev (serves raw files). | `false` | ❌ No |

---

## 🗄️ Database Strategies

BenTro is stateless (except for the database), so you can run the database anywhere.

### Option A: Database as a Service (PaaS) - **Recommended**
Use a managed database like **AWS RDS**, **Google Cloud SQL**, or **Azure SQL**.

1.  Provision a PostgreSQL instance.
2.  Create a database (e.g., `bentro`) and user.
3.  Update your **Kubernetes ConfigMap/Secret**:
    *   `DB_HOST`: `<your-cloud-endpoint>`
    *   `DB_PORT`: `5432`

**Pros:** High availability, backups managed by provider.

### Option B: Database as a Container (In-Cluster)
Run PostgreSQL inside your Kubernetes cluster using a `StatefulSet` or Helm Chart.

1.  Deploy Postgres:
    ```bash
    helm install my-db oci://registry-1.docker.io/bitnami/charts/postgresql
    ```
2.  Update your **Kubernetes ConfigMap**:
    *   `DB_HOST`: `my-db-postgresql.default.svc.cluster.local` (Service DNS name)

**Pros:** Cheaper, keeps data within the cluster.
**Cons:** You manage backups and persistence.

---

## 🚀 Deployment Steps

### 1. Configure Secrets & ConfigMaps

Create a `config.yaml` (or update `k8s/deployment.yaml` env section):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bentro-app-config
data:
  DB_HOST: "postgres.default.svc.cluster.local" # Adjust for your DB
  DB_PORT: "5432"
  DB_NAME: "bentro"
  DB_USER: "bentro_user"
---
apiVersion: v1
kind: Secret
metadata:
  name: bentro-app-secret
type: Opaque
stringData:
  DB_PASSWORD: "secure_password_here"
  JWT_SECRET: "super_secret_signing_key_change_me"
```

Apply it:
```bash
kubectl apply -f config.yaml
```

### 2. Deploy Application

Ensure your `deployment.yaml` references the ConfigMap/Secret keys created above.

```bash
kubectl apply -f k8s/deployment.yaml
```

### 3. Expose Application

Use a **Service** (NodePort or LoadBalancer) or **Ingress** to access the app.

**Example Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: bentro-service
spec:
  selector:
    app: bentro-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer # Or NodePort/ClusterIP
```

### 4. Ingress Configuration (Optional)

If using an Ingress Controller (like Nginx), update your `ingress.yaml`.

> [!WARNING]
> **Change the Domain Name!**
> The domain `bentro.bento.lab` is configured for a specific local environment.
> **You MUST change this** to your own domain (e.g., `bentro.your-company.com` or `localhost`) in the `host` field, otherwise you won't be able to access the app!

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bentro-ingress
  annotations:
    # homepage: "true" # specific to bento-lab dashboard
spec:
  rules:
  - host: bentro.bento.lab # <--- UPDATE THIS
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bentro-app
            port:
              number: 8080
```

---

## 🔍 Verification

1.  Check Pod Status:
    ```bash
    kubectl get pods
    ```
2.  Check Logs (for DB connection success):
    ```bash
    kubectl logs -l app=bentro-app
    ```
    ✅ Look for: `Database connection established`

---

## ❓ Troubleshooting

- **`failed to connect to database`**:
    - Check `DB_HOST` DNS resolution.
    - Verify Network Policies allow traffic from App Pod -> DB Pod/External.
    - Check User/Password credentials.
- **`panic: JWT_SECRET not set`** (if applicable):
    - Ensure `JWT_SECRET` is defined in the Secret. 


---

## 🏗️ Architecture Support (AMD64 vs ARM64)

The application supports both standard servers (AMD64/Intel) and ARM-based devices (Raspberry Pi/Apple Silicon).

However, due to current registry limitations, you must specify the correct image tag for your cluster's architecture if you are **NOT** using the Raspberry Pi cluster (`v0.15.4` is currently pointed to ARM64).

**Image Tags:**
*   **Raspberry Pi / ARM64:** `dnlouko/bentro-app:v0.15.4-arm64` (or `v0.15.4`)
*   **Standard Servers / Cloud (AMD64):** `dnlouko/bentro-app:v0.15.4-amd64`

### How to Change
Edit `k8s/deployment.yaml`:

```yaml
      containers:
      - name: bentro-app
        # For Intel/AMD Servers:
        image: dnlouko/bentro-app:v0.15.4-amd64
        # For Raspberry Pi:
        # image: dnlouko/bentro-app:v0.15.4-arm64
```
