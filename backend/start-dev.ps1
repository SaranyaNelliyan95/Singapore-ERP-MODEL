# Loads backend\.env into the process, then starts Spring Boot.
# Usage:  .\start-dev.ps1

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Error "Missing .env - copy .env.example to .env and set SMTP_PASSWORD."
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Length -ne 2) { return }
    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    # Gmail App Passwords are often copied with spaces - strip them
    if ($name -eq "SMTP_PASSWORD") {
        $value = $value -replace "\s", ""
    }
    Set-Item -Path "Env:$name" -Value $value
}

if (-not $env:SMTP_PASSWORD -or $env:SMTP_PASSWORD -eq "PASTE_GMAIL_APP_PASSWORD_HERE") {
    Write-Warning "SMTP_PASSWORD is not set in .env - Gmail will reject login."
}

Write-Host ("Starting Workright backend on port {0} MAIL_ENABLED={1} FROM={2}" -f $env:SERVER_PORT, $env:MAIL_ENABLED, $env:MAIL_FROM)
Set-Location $PSScriptRoot
.\mvnw.cmd spring-boot:run
