# Testing Guide - Upcover Subscription API

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start the server
pnpm start:dev

# 3. Run the test script (PowerShell)
powershell -ExecutionPolicy Bypass -File .\test-api.ps1

# Or with bash (Git Bash / WSL)
bash test-api.sh
```

---

## What the Test Script Covers

| # | Test | Expected |
|---|------|----------|
| 1 | Health check `GET /` | 200 |
| 2 | Swagger docs `GET /api` | 200 |
| 3 | Register new user | 201 |
| 4 | Duplicate registration | 409 Conflict |
| 5 | Login | 201 + JWT token |
| 6 | Login with wrong password | 401 |
| 7 | Get subscription plans | 200 + 3 plans |
| 8 | Access protected route without token | 401 |
| 9 | Get subscription (no subscription yet) | 404 |
| 10 | Create Stripe checkout session | 201 or 500* |
| 11 | Admin-only route as regular user | 403 |
| 12 | Checkout with invalid plan | 400/404 |

> \* Test 10 returns 500 with placeholder price IDs - this is expected. It means   your Stripe API key works and the request reached Stripe. See "Setting Up Real Stripe Prices" below.

---

## Testing Without Stripe Keys

The app runs fine without Stripe keys. Only Stripe-dependent endpoints will fail:
- `POST /subscription/checkout` - returns 400
- `POST /subscription/cancel` - returns 400
- `POST /webhook` - returns 400

Everything else works: registration, login, plans, auth guards, admin RBAC.

---

## Testing With Stripe Test Keys (Current Setup)

Your `.env` already has test keys configured. Here's what works:

**Works now:**
- All auth endpoints (register, login)
- Plans listing
- Auth guards (JWT validation, RBAC)
- Stripe API connection (key is valid)

**Needs real price IDs:**
- Checkout session creation (needs Stripe price IDs)
- Full subscription flow (checkout -> webhook -> subscription in DB)

---

## Setting Up Real Stripe Prices

To get the full checkout flow working:

### 1. Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Click **+ Add product**
3. Create 3 products:

| Product | Price | Billing |
|---------|-------|---------|
| Basic | $9.99/month | Recurring |
| Standard | $19.99/month | Recurring |
| Premium | $39.99/month | Recurring |

4. After creating each product, copy the **Price ID** (starts with `price_`)

### 2. Update Price IDs in Code

Open `src/subscriptions/plans.constant.ts` and replace the placeholder values:

```typescript
{
    id: PlanId.BASIC,
    // ...
    stripePriceId: 'price_1ABC...',  // <-- paste your real price ID
},
```

### 3. Test the Full Flow

```bash
# Restart the server
pnpm start:dev

# Run the test script again - test 10 should now return a real Stripe URL
powershell -ExecutionPolicy Bypass -File .\test-api.ps1
```

You can also test manually:

```powershell
# Login
$login = Invoke-RestMethod -Uri "http://localhost:3000/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"your@email.com","password":"your-password"}'

# Create checkout
$checkout = Invoke-RestMethod -Uri "http://localhost:3000/subscriptions/checkout" `
  -Method POST -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $($login.access_token)" } `
  -Body '{"planId":"basic"}'

# Open the Stripe checkout page
Start-Process $checkout.url
```

Use Stripe test card: `4242 4242 4242 4242` with any future expiry and any CVC.

---

## Setting Up Webhooks (Optional)

Webhooks let Stripe notify your server after a successful payment. For local testing:

### Option A: Stripe CLI (Recommended)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/subscriptions/webhook
```

Copy the webhook signing secret (starts with `whsec_`) and add it to `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Option B: Without Webhooks

The app works without webhook secret. When `STRIPE_WEBHOOK_SECRET` is empty:
- Incoming webhook payloads are parsed as JSON without signature verification
- This is fine for local testing but **never use this in production**

---

## Running Unit Tests

```bash
# All unit tests (18 tests)
pnpm test

# With coverage report
pnpm test:cov

# Watch mode
pnpm test:watch
```

---

## Manual Testing with Swagger UI

1. Start the server: `pnpm start:dev`
2. Open http://localhost:3000/api
3. Register a user via `POST /register`
4. Login via `POST /login` - copy the `access_token`
5. Click the **Authorize** button (lock icon) at the top
6. Enter: `Bearer <your-token>`
7. Now you can test all protected endpoints directly in the browser

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` | Server not running. Run `pnpm start:dev` |
| `No such price` | Placeholder price IDs. Create real prices in Stripe Dashboard |
| `Stripe is not configured` | Missing `STRIPE_SECRET_KEY` in `.env` |
| MongoDB connection error | Check `MONGO_URI` in `.env` |
| `401 Unauthorized` on protected routes | Include `Authorization: Bearer <token>` header |
| `403 Forbidden` on admin routes | User needs `admin` role in database |
