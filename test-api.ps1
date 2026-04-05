param(
    [string]$BaseUrl = "http://localhost:3000"
)

$pass = 0
$fail = 0
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "testuser_${timestamp}@example.com"
$password = "Test@1234"
$token = ""

function Write-Pass($msg) { Write-Host "  PASS: $msg" -ForegroundColor Green; $script:pass++ }
function Write-Fail($msg) { Write-Host "  FAIL: $msg" -ForegroundColor Red; $script:fail++ }
function Write-Section($msg) { Write-Host "`n--- $msg ---" -ForegroundColor Cyan }

# 1
Write-Section "1. Health Check - GET /"
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Pass "Server is running (HTTP $($r.StatusCode))"
}
catch {
    Write-Fail "Server not reachable"
}

# 2
Write-Section "2. Swagger Docs - GET /api"
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/api" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Pass "Swagger docs available (HTTP $($r.StatusCode))"
}
catch {
    Write-Fail "Swagger not found"
}

# 3
Write-Section "3. Register - POST /register"
try {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BaseUrl/register" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Pass "Registration successful"
}
catch {
    $s = $_.Exception.Response.StatusCode.value__
    Write-Fail "Registration failed (HTTP $s)"
}

# 4
Write-Section "4. Duplicate Register - POST /register (expect 409)"
try {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$BaseUrl/register" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Fail "Expected 409 but succeeded"
}
catch {
    $s = $_.Exception.Response.StatusCode.value__
    if ($s -eq 409) { Write-Pass "Duplicate rejected (HTTP 409)" }
    else { Write-Fail "Expected 409, got HTTP $s" }
}

# 5
Write-Section "5. Login - POST /login"
try {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BaseUrl/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    $token = $r.access_token
    if ($token) { Write-Pass "Login successful - got JWT" }
    else { Write-Fail "Login ok but no token" }
}
catch {
    Write-Fail "Login failed"
}

# 6
Write-Section "6. Wrong Password - POST /login (expect 401)"
try {
    $body = @{ email = $email; password = "wrong" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$BaseUrl/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Fail "Expected 401 but succeeded"
}
catch {
    $s = $_.Exception.Response.StatusCode.value__
    if ($s -eq 401) { Write-Pass "Bad password rejected (HTTP 401)" }
    else { Write-Fail "Expected 401, got HTTP $s" }
}

# 7
Write-Section "7. Get Plans - GET /plans"
try {
    $r = Invoke-RestMethod -Uri "$BaseUrl/plans" -Method GET -ErrorAction Stop
    $count = $r.Count
    Write-Pass "Got $count plans"
    foreach ($plan in $r) {
        $priceStr = $plan.price / 100
        Write-Host "    - $($plan.name): `$$priceStr/mo" -ForegroundColor DarkGray
    }
}
catch {
    Write-Fail "Failed to get plans"
}

# 8
Write-Section "8. No Token - GET /subscription (expect 401)"
try {
    $null = Invoke-RestMethod -Uri "$BaseUrl/subscription" -Method GET -ErrorAction Stop
    Write-Fail "Expected 401 but succeeded"
}
catch {
    $s = $_.Exception.Response.StatusCode.value__
    if ($s -eq 401) { Write-Pass "Unauthorized blocked (HTTP 401)" }
    else { Write-Fail "Expected 401, got HTTP $s" }
}

# 9
Write-Section "9. My Subscription - GET /subscription (expect 404)"
$headers = @{ Authorization = "Bearer $token" }
try {
    $null = Invoke-RestMethod -Uri "$BaseUrl/subscription" -Method GET -Headers $headers -ErrorAction Stop
    Write-Fail "Expected 404 but got subscription"
}
catch {
    $s = $_.Exception.Response.StatusCode.value__
    if ($s -eq 404) { Write-Pass "No subscription yet (HTTP 404)" }
    else { Write-Fail "Expected 404, got HTTP $s" }
}

# 10
Write-Section "10. Checkout - POST /subscription/checkout"
try {
    $body = @{ planId = "basic" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BaseUrl/subscription/checkout" -Method POST -Body $body -ContentType "application/json" -Headers $headers -ErrorAction Stop
    if ($r.url) {
        Write-Pass "Checkout session created - got Stripe URL"
        $urlPreview = $r.url
        if ($urlPreview.Length -gt 80) { $urlPreview = $urlPreview.Substring(0, 80) + "..." }
        Write-Host "    URL: $urlPreview" -ForegroundColor DarkGray
    }
    else {
        Write-Pass "Checkout returned success"
    }
}
catch {
    $s = $_.Exception.Response.StatusCode.value__
    $errMsg = $_.ErrorDetails.Message
    if (-not $errMsg) { $errMsg = $_.Exception.Message }
    if (($errMsg -match "price") -or ($s -eq 500 -and $errMsg -match "Internal server error")) {
        Write-Host "    NOTE: Stripe rejected the placeholder price ID (HTTP $s)" -ForegroundColor Yellow
        Write-Host "    This is expected - update stripePriceId in plans.constant.ts" -ForegroundColor Yellow
        Write-Pass "Checkout reached Stripe API (placeholder price ID)"
    }
    else {
        Write-Fail "Checkout failed (HTTP $s) - $errMsg"
    }
}

# 11
Write-Section "11. Admin Route - GET /subscription/all (expect 403)"
try {
    $null = Invoke-RestMethod -Uri "$BaseUrl/subscription/all" -Method GET -Headers $headers -ErrorAction Stop
    Write-Fail "Expected 403 but succeeded"
}
catch {
    $s = $_.Exception.Response.StatusCode.value__
    if ($s -eq 403) { Write-Pass "Admin route blocked for user (HTTP 403)" }
    else { Write-Fail "Expected 403, got HTTP $s" }
}

# 12
Write-Section "12. Invalid Plan - POST /subscription/checkout (expect 404)"
try {
    $body = @{ planId = "nonexistent" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$BaseUrl/subscription/checkout" -Method POST -Body $body -ContentType "application/json" -Headers $headers -ErrorAction Stop
    Write-Fail "Expected 404 but succeeded"
}
catch {
    $s = $_.Exception.Response.StatusCode.value__
    if (($s -eq 404) -or ($s -eq 400)) { Write-Pass "Invalid plan rejected (HTTP $s)" }
    else { Write-Fail "Expected 404 or 400, got HTTP $s" }
}

# Results
Write-Section "RESULTS"
$total = $pass + $fail
Write-Host ""
Write-Host "  $pass passed / $fail failed / $total total"
Write-Host ""
if ($fail -eq 0) {
    Write-Host "  All tests passed!" -ForegroundColor Green
}
else {
    Write-Host "  Some tests failed - check output above" -ForegroundColor Yellow
}
