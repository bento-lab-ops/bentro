#!/bin/bash

# Deploy v0.2.4 to bentro namespace
echo "🚀 Deploying BenTro v0.2.4..."

# Apply Kubernetes manifests
echo "📦 Applying manifests..."
kubectl apply -f k8s/configmap.yaml -n bentro
kubectl apply -f k8s/secret.yaml -n bentro
kubectl apply -f k8s/postgres-pv.yaml
kubectl apply -f k8s/pvc.yaml -n bentro
kubectl apply -f k8s/postgres-deployment.yaml -n bentro
kubectl apply -f k8s/postgres-service.yaml -n bentro
kubectl apply -f k8s/deployment.yaml -n bentro
kubectl apply -f k8s/service.yaml -n bentro
kubectl apply -f k8s/ingress.yaml -n bentro

# Force restart deployment to pick up new image
echo "🔄 Restarting deployment..."
kubectl rollout restart deployment bentro-app -n bentro

# Wait for rollout
echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/bentro-app -n bentro

echo "✅ Deployment complete! Access at http://bentro.bento.lab"
