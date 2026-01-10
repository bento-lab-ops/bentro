# scripts/verify_local.ps1 - Safety Guardrail Script
# Usage: ./scripts/verify_local.ps1

$ErrorActionPreference = "Stop"

Write-Host "🛡️  Starting Safety Guardrails Verification..." -ForegroundColor Cyan

# Ensure we are in the project root
Set-Location "$PSScriptRoot/.."
$PROJECT_ROOT = (Get-Location).Path
$WEB_DIR_NATIVE = "$PROJECT_ROOT\web"

# Normalize for Docker (WSL context likely required for nerdctl on Windows)
# Convert 'C:\Users\...' to '/mnt/c/Users/...'
$WEB_MOUNT = $WEB_DIR_NATIVE -replace '^([a-zA-Z]):', '/mnt/$1' -replace '\\', '/'
$WEB_MOUNT = $WEB_MOUNT.ToLower() # WSL is case sensitive sometimes, but Windows isn't. Lowercase drive letter is standard.

# 1. Dependency Check: Lint (via Docker)
Write-Host "`n[1/4] Checking Frontend Syntax (Lint via Docker)..." -ForegroundColor Yellow

try {
    # Debug Mount
    Write-Host "    Debug: Mounting '$WEB_MOUNT' to '/app'"
    
    # Check dependencies
    if (-not (Test-Path "$WEB_DIR_NATIVE\node_modules")) {
        Write-Host "    Installing dependencies (in container)..."
        # We use -v "HOST:CONTAINER" quoting is critical
        nerdctl run --rm -v "${WEB_MOUNT}:/app" -w /app node:18 npm install --silent
    }

    Write-Host "    Running eslint..."
    # listing files to debug mount if needed
    nerdctl run --rm -v "${WEB_MOUNT}:/app" -w /app node:18 sh -c "ls -la /app/package.json && npm run lint"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Linting Failed"
    }
    else {
        Write-Host "    ✅ Lint Passed" -ForegroundColor Green
    }
}
catch {
    Write-Error "❌ Linting/Dependency Check Failed! Fix syntax errors before committing.`n$_"
}

# 2. Build Check: Docker Build
Write-Host "`n[2/4] Verifying Docker Build..." -ForegroundColor Yellow
$IMAGE_TAG = "bentro-local-verify:latest"
nerdctl build -t $IMAGE_TAG .
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Docker Build Failed!"
}

# 3. Runtime Check: Smoke Test
Write-Host "`n[3/4] Running Smoke Test (Container)..." -ForegroundColor Yellow
$CONTAINER_NAME = "bentro_verify_$(Get-Random)"
try {
    # Run container detached with SKIP_DB=true for smoke test
    nerdctl run -d --name $CONTAINER_NAME -p 8089:8080 -e "SKIP_DB=true" $IMAGE_TAG | Out-Null
    
    # Wait for startup
    Write-Host "    Waiting 10s for startup... (Logs below)"
    Start-Sleep -Seconds 10
    
    # Debug: Print logs if it crashes early
    nerdctl logs $CONTAINER_NAME

    # Check Health Endpoint (Internally via exec, avoids Windows networking issues)
    Write-Host "    Checking Internal Health via nerdctl exec..."
    
    # Alpine image has wget by default. We check localhost:8080 inside the container.
    # We expect 200 OK.
    nerdctl exec $CONTAINER_NAME wget -qO- http://localhost:8080/health
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Server is responding (Internal Health Check)" -ForegroundColor Green
    }
    else {
        throw "Internal Health Check Failed"
    }

    # Check for Static File Servability (CSS)
    Write-Host "    Checking Static Asset via nerdctl exec..."
    nerdctl exec $CONTAINER_NAME wget -q --spider http://localhost:8080/static/bentro.css
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Static Assets serving (Internal Check)" -ForegroundColor Green
    }
    else {
        throw "Static Asset Check Failed"
    }

}
catch {
    Write-Error "❌ Runtime Verification Failed: $_"
}
finally {
    # Cleanup
    Write-Host "    Cleaning up container..."
    nerdctl rm -f $CONTAINER_NAME | Out-Null
}

Write-Host "`n✅✅✅ VERIFICATION PASSED! Ready to Push. ✅✅✅" -ForegroundColor Green
