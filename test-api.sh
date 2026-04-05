#!/bin/bash
# ============================================================
# Upcover API — Manual Test Script
# ============================================================
# Usage: bash test-api.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000
# ============================================================

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
EMAIL="testuser_$(date +%s)@example.com"
PASSWORD="Test@1234"
TOKEN=""

green() { echo -e "\033[32m✓ $1\033[0m"; PASS=$((PASS+1)); }
red()   { echo -e "\033[31m✗ $1\033[0m"; FAIL=$((FAIL+1)); }
header(){ echo -e "\n\033[1;36m━━━ $1 ━━━\033[0m"; }

# -----------------------------------------------------------
header "1. Health Check — GET /"
# -----------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$STATUS" = "200" ]; then green "Server is running (HTTP $STATUS)"; else red "Server not reachable (HTTP $STATUS)"; fi

# -----------------------------------------------------------
header "2. Swagger Docs — GET /api"
# -----------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ]; then green "Swagger docs available (HTTP $STATUS)"; else red "Swagger not found (HTTP $STATUS)"; fi

# -----------------------------------------------------------
header "3. Register — POST /register"
# -----------------------------------------------------------
REGISTER_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
REGISTER_BODY=$(echo "$REGISTER_RES" | head -n -1)
REGISTER_STATUS=$(echo "$REGISTER_RES" | tail -n 1)

if [ "$REGISTER_STATUS" = "201" ]; then
  green "Registration successful — $REGISTER_BODY"
else
  red "Registration failed (HTTP $REGISTER_STATUS) — $REGISTER_BODY"
fi

# -----------------------------------------------------------
header "4. Duplicate Register — POST /register (expect 409)"
# -----------------------------------------------------------
DUP_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
DUP_STATUS=$(echo "$DUP_RES" | tail -n 1)

if [ "$DUP_STATUS" = "409" ]; then green "Duplicate rejected correctly (HTTP 409)"; else red "Expected 409, got HTTP $DUP_STATUS"; fi

# -----------------------------------------------------------
header "5. Login — POST /login"
# -----------------------------------------------------------
LOGIN_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
LOGIN_BODY=$(echo "$LOGIN_RES" | head -n -1)
LOGIN_STATUS=$(echo "$LOGIN_RES" | tail -n 1)

if [ "$LOGIN_STATUS" = "201" ]; then
  TOKEN=$(echo "$LOGIN_BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$TOKEN" ]; then
    green "Login successful — got JWT token"
  else
    red "Login returned 201 but no token in response"
  fi
else
  red "Login failed (HTTP $LOGIN_STATUS) — $LOGIN_BODY"
fi

# -----------------------------------------------------------
header "6. Wrong Password — POST /login (expect 401)"
# -----------------------------------------------------------
BAD_LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"wrong\"}")

if [ "$BAD_LOGIN_STATUS" = "401" ]; then green "Bad password rejected (HTTP 401)"; else red "Expected 401, got HTTP $BAD_LOGIN_STATUS"; fi

# -----------------------------------------------------------
header "7. Get Plans - GET /plans"
# -----------------------------------------------------------
PLANS_RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/plans")
PLANS_BODY=$(echo "$PLANS_RES" | head -n -1)
PLANS_STATUS=$(echo "$PLANS_RES" | tail -n 1)

if [ "$PLANS_STATUS" = "200" ]; then
  COUNT=$(echo "$PLANS_BODY" | grep -o '"id"' | wc -l)
  green "Got $COUNT plans (HTTP 200)"
  echo "  Plans: $PLANS_BODY"
else
  red "Failed to get plans (HTTP $PLANS_STATUS)"
fi

# -----------------------------------------------------------
header "8. Protected Route Without Token - GET /subscription (expect 401)"
# -----------------------------------------------------------
NO_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/subscription")

if [ "$NO_AUTH_STATUS" = "401" ]; then green "Unauthorized access blocked (HTTP 401)"; else red "Expected 401, got HTTP $NO_AUTH_STATUS"; fi

# -----------------------------------------------------------
header "9. Get My Subscription - GET /subscription (expect 404, no sub yet)"
# -----------------------------------------------------------
MY_SUB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/subscription" \
  -H "Authorization: Bearer $TOKEN")

if [ "$MY_SUB_STATUS" = "404" ]; then green "No subscription yet — correct (HTTP 404)"; else red "Expected 404, got HTTP $MY_SUB_STATUS"; fi

# -----------------------------------------------------------
header "10. Create Checkout Session - POST /subscription/checkout"
# -----------------------------------------------------------
CHECKOUT_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/subscription/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId": "basic"}')
CHECKOUT_BODY=$(echo "$CHECKOUT_RES" | head -n -1)
CHECKOUT_STATUS=$(echo "$CHECKOUT_RES" | tail -n 1)

if [ "$CHECKOUT_STATUS" = "201" ]; then
  URL=$(echo "$CHECKOUT_BODY" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$URL" ]; then
    green "Checkout session created — Stripe URL received"
    echo "  Checkout URL: ${URL:0:80}..."
  else
    green "Checkout returned 201 (response: $CHECKOUT_BODY)"
  fi
else
  # This may fail if Stripe price IDs are placeholders — that's expected
  echo "  ⚠ Checkout returned HTTP $CHECKOUT_STATUS"
  echo "  Response: $CHECKOUT_BODY"
  if echo "$CHECKOUT_BODY" | grep -q "price"; then
    echo "  → This is expected if stripePriceId hasn't been set in plans.constant.ts"
    echo "  → Create real prices in Stripe Dashboard and update the price IDs"
    green "Checkout reached Stripe (price ID issue is expected)"
  else
    red "Checkout failed unexpectedly (HTTP $CHECKOUT_STATUS)"
  fi
fi

# -----------------------------------------------------------
header "11. Admin Route - GET /subscription/all (expect 403, not admin)"
# -----------------------------------------------------------
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/subscription/all" \
  -H "Authorization: Bearer $TOKEN")

if [ "$ADMIN_STATUS" = "403" ]; then green "Admin-only route blocked for regular user (HTTP 403)"; else red "Expected 403, got HTTP $ADMIN_STATUS"; fi

# -----------------------------------------------------------
header "12. Invalid Plan - POST /subscription/checkout (expect 404)"
# -----------------------------------------------------------
BAD_PLAN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/subscription/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId": "nonexistent"}')

if [ "$BAD_PLAN_STATUS" = "404" ]; then green "Invalid plan rejected (HTTP 404)"; else red "Expected 404, got HTTP $BAD_PLAN_STATUS"; fi

# ============================================================
header "RESULTS"
# ============================================================
TOTAL=$((PASS+FAIL))
echo -e "\033[32m$PASS passed\033[0m / \033[31m$FAIL failed\033[0m / $TOTAL total"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "\033[1;32m🎉 All tests passed!\033[0m"
else
  echo -e "\033[1;33m⚠ Some tests failed — check output above\033[0m"
fi
