# Postman Testing Guide

## Import the Collection

1. Open **Postman** (download from [postman.com](https://www.postman.com/downloads/) if needed)
2. Click **Import** (top-left)
3. Drag & drop `postman_collection.json` or click **Upload Files** and select it
4. The collection **"Upcover - Subscription Management API"** will appear in the sidebar

## Setup

The collection uses two variables:

| Variable  | Default                 | Description          |
| --------- | ----------------------- | -------------------- |
| `baseUrl` | `http://localhost:3000` | Server URL           |
| `token`   | *(empty)*               | JWT token (auto-set) |

To change the `baseUrl`:
1. Click the collection name → **Variables** tab
2. Update the `baseUrl` value
3. Click **Save**

## Start the Server

```bash
pnpm start:dev
```

Server runs on `http://localhost:3000`.

## Testing Flow (Recommended Order)

### Step 1: Health Check
- Send **Health Check** (`GET /`)
- Expected: `200 OK` with `"Hello World!"`

### Step 2: Swagger Docs
- Send **Swagger Docs** (`GET /api`)
- Expected: `200 OK` — HTML Swagger page
- You can also open `http://localhost:3000/api` in your browser

### Step 3: Register a User
- Send **Register** (`POST /register`)
- Expected: `201 Created` with `{ "access_token": "..." }`
- **The JWT token is automatically saved** to the `token` collection variable via the test script

### Step 4: Test Duplicate Registration
- Send **Register (Duplicate)** again
- Expected: `409 Conflict`

### Step 5: Login
- Send **Login** (`POST /login`)
- Expected: `200 OK` with `{ "access_token": "..." }`
- **Token is automatically updated** in the collection variable

### Step 6: Test Wrong Password
- Send **Login (Wrong Password)**
- Expected: `401 Unauthorized`

### Step 7: Get Plans
- Send **Get All Plans** (`GET /plans`)
- Expected: `200 OK` with 3 plans (Basic, Standard, Premium)
- No auth required — this is a public endpoint

### Step 8: Get Subscription (No Token)
- Send **Get My Subscription (No Token)**
- Expected: `401 Unauthorized` (no Authorization header)

### Step 9: Get My Subscription
- Send **Get My Subscription** (`GET /subscription`)
- Expected: `404 Not Found` (no subscription yet)

### Step 10: Create Checkout Session
- Send **Create Checkout Session (Basic Plan)** (`POST /subscription/checkout`)
- If Stripe price IDs are configured: `201` with `{ "url": "https://checkout.stripe.com/..." }`
- If using placeholder price IDs: `500` error (expected — see note below)

### Step 11: Cancel Subscription
- Send **Cancel Subscription** (`POST /subscription/cancel`)
- Expected: `404 Not Found` (no active subscription to cancel)

### Step 12: Admin Route (RBAC Test)
- Send **Get All Subscriptions (Admin Only)**
- Expected: `403 Forbidden` (regular user, not admin)

### Step 13: Test Webhooks
- Send **Stripe Webhook (checkout.session.completed)**
- Replace `REPLACE_WITH_USER_ID` in the body with a real user ID from MongoDB
- Expected: `200 OK` with `{ "received": true }`

## Auto-Token Feature

The **Register** and **Login** requests have built-in test scripts that automatically save the JWT token to the `{{token}}` collection variable. All protected endpoints use `Bearer {{token}}` in the Authorization header, so you don't need to copy-paste tokens manually.

## About Stripe Price IDs

The plans in `plans.constant.ts` use placeholder Stripe price IDs (`price_basic_REPLACE_ME`, etc.). To enable full checkout flow:

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Create 3 products with prices (Basic $9.99, Standard $19.99, Premium $39.99)
3. Copy the `price_xxx` IDs
4. Update `src/subscriptions/plans.constant.ts` with real price IDs

## About Webhook Testing

When `STRIPE_WEBHOOK_SECRET` is empty in `.env`, the webhook endpoint skips Stripe signature verification. This allows direct testing from Postman without needing `stripe listen`.

For production, set a real webhook secret and use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events.

## Tips

- **Run requests in order** — Register/Login first to get the token
- **Check the Console** — View → Show Postman Console for request/response details
- **Use Runner** — Click "Run collection" to execute all requests sequentially
- **Change email** — Edit the Register body to create different test users
