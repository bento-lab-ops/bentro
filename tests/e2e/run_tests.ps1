$currentDir = Get-Location
$testDir = "$currentDir\tests\e2e"

Write-Host "Building E2E Test Image..."
Set-Location $testDir
# Use relative path to avoid Windows path resolution issues in nerdctl
nerdctl build -t bentro-e2e -f Dockerfile .

Write-Host "Running Playwright Tests..."
# access host network so it can reach localhost/ingress
nerdctl run --rm --network host bentro-e2e

# Restore location
Set-Location $currentDir
