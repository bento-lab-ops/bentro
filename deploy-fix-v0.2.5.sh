# Deployment Script for BenTro v0.2.5 (Fix)
# Fixes: Broken UI due to corrupted index.html

# Step 1: Build new Docker image
nerdctl build -t dnlouko/bentro-app:v0.2.5 .
nerdctl tag dnlouko/bentro-app:v0.2.5 dnlouko/bentro-app:latest

# Step 2: Push to registry
nerdctl push dnlouko/bentro-app:v0.2.5
nerdctl push dnlouko/bentro-app:latest

# Step 3: Update deployment image version
kubectl set image deployment/bentro-app retro-app=dnlouko/bentro-app:v0.2.5 -n bentro

# Step 4: Restart deployment to pick up changes
kubectl rollout restart deployment/bentro-app -n bentro

# Step 5: Wait for deployment
kubectl rollout status deployment/bentro-app -n bentro

# Step 6: Verify
kubectl get pods -n bentro
echo "✅ BenTro v0.2.5 fixed and deployed successfully!"
