param(
    [Parameter(Mandatory=$true)]
    [string]$PublicIp
)

$key = "$env:USERPROFILE\.ssh\id_ed25519_oci"
if (-not (Test-Path $key)) {
    Write-Error "SSH private key not found at $key"
    exit 1
}

Write-Host "Verifying SSH connection to $PublicIp..." -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\ssh.exe" -i $key -o StrictHostKeyChecking=accept-new ubuntu@$PublicIp "echo 'SSH connection successful!'"

Write-Host "Running turnkey setup on Oracle VM ($PublicIp)..." -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\ssh.exe" -i $key ubuntu@$PublicIp "if [ ! -d ~/oudio-books-AI ]; then git clone https://github.com/devsura3939/oudio-books-AI.git ~/oudio-books-AI; fi; cd ~/oudio-books-AI && git pull && chmod +x deploy/oracle/setup.sh && ./deploy/oracle/setup.sh"
