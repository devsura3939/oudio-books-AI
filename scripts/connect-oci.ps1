param(
    [Parameter(Mandatory=$true)]
    [string]$PublicIp
)

$key = "$env:USERPROFILE\.ssh\id_ed25519_oci"
if (-not (Test-Path $key)) {
    Write-Error "SSH private key not found at $key"
    exit 1
}

Write-Host "Connecting to Oracle Ampere VM at $PublicIp..." -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\ssh.exe" -i $key -o StrictHostKeyChecking=accept-new ubuntu@$PublicIp
