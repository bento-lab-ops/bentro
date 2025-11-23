# Deployment Script for Rollback to v0.2.3 (with Bentro Infrastructure)

# Step 1: Build Docker image from current code (v0.2.3)
nerdctl build -t dnlouko/bentro-app:v0.2.3-revert .
nerdctl tag dnlouko/bentro-app:v0.2.3-revert dnlouko/bentro-app:latest

# Step 2: Push to registry
nerdctl push dnlouko/bentro-app:v0.2.3-revert
nerdctl push dnlouko/bentro-app:latest

# Step 3: Apply Kubernetes manifests (updated for bentro namespace)
kubectl apply -f k8s/

# Step 4: Restart deployment to ensure new image is picked up
kubectl rollout restart deployment/bentro-app -n bentro

# Step 5: Wait for deployment
kubectl rollout status deployment/bentro-app -n bentro

# Step 6: Verify
kubectl get pods -n bentro
echo "✅ Rollback to v0.2.3 (Bentro Infra) completed!"
