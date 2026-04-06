# Upcover API

A NestJS REST API for managing insurance subscriptions with JWT-based authentication, role-based access control, and MongoDB persistence.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the App](#running-the-app)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [API Usage](#api-usage)
  - [Auth](#auth)
  - [Plans](#plans)
  - [Subscriptions](#subscriptions)
  - [Stripe Checkout](#stripe-checkout)
  - [Admin](#admin)
- [Postman Collection](#postman-collection)
- [Swagger Docs](#swagger-docs)
- [Running Tests](#running-tests)

---

## Tech Stack

- **NestJS** — Node.js framework
- **MongoDB + Mongoose** — Database
- **JWT** — Authentication
- **bcrypt** — Password hashing
- **class-validator** — Request validation
- **Stripe** — Payment processing (Checkout Sessions + Webhooks)
- **Swagger** — API documentation

---

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- MongoDB instance (local or Atlas)

---

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/dheereshag/upcover.git
   cd upcover
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root (see [Environment Variables](#environment-variables)).

---

## Running the App

```bash
# Development (watch mode)
pnpm run start:dev

# Standard start
pnpm run start

# Production
pnpm run build
pnpm run start:prod
```

The server starts on `http://localhost:3000` by default (configurable via `PORT`).

---

## Deployment

Live deployment URL:

**[https://upcover-seven.vercel.app/](https://upcover-seven.vercel.app/)**

---

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/upcover
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1y
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

| Variable                  | Description                                          | Default |
|---------------------------|------------------------------------------------------|---------|
| `PORT`                    | Port the server listens on                           | `3000`  |
| `MONGO_URI`               | MongoDB connection string                            | —       |
| `JWT_SECRET`              | Secret key for signing JWT tokens                    | —       |
| `JWT_EXPIRES_IN`          | JWT token expiration duration                        | `1y`    |
| `STRIPE_SECRET_KEY`       | Stripe secret API key                                | —       |
| `STRIPE_PUBLISHABLE_KEY`  | Stripe publishable key (for frontend use)            | —       |
| `STRIPE_WEBHOOK_SECRET`   | Stripe webhook signing secret (`whsec_...`)          | —       |

---

## API Usage

Base URL: `http://localhost:3000`

Authenticated routes require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

### Auth

#### `POST /register`

Register a new user account.

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response `201`:**

```json
{
  "access_token": "eyJhbGci..."
}
```

---

#### `POST /login`

Authenticate and receive a JWT token.

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response `200`:**

```json
{
  "access_token": "eyJhbGci..."
}
```

---

### Plans

#### `GET /plans`

Returns all available subscription plans. No authentication required.

**Response `200`:**

```json
[
  {
    "id": "basic",
    "name": "Basic",
    "price": 9.99,
    "currency": "INR",
    "features": ["Up to 1 user", "Basic support", "10 GB storage"]
  },
  {
    "id": "standard",
    "name": "Standard",
    "price": 19.99,
    "currency": "INR",
    "features": ["Up to 5 users", "Priority support", "50 GB storage"]
  },
  {
    "id": "premium",
    "name": "Premium",
    "price": 39.99,
    "currency": "INR",
    "features": ["Unlimited users", "24/7 support", "500 GB storage"]
  }
]
```

---

### Subscriptions

All subscription routes require a valid JWT token.

#### `GET /subscription`

Get the authenticated user's current subscription.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**

```json
{
  "userId": "...",
  "planId": "standard",
  "status": "active",
  "stripeSessionId": "cs_test_...",
  "stripePaymentIntentId": "pi_..."
}
```

Possible `status` values: `pending` (checkout started), `active` (payment confirmed), `cancelled`.

---

#### `POST /subscription/cancel`

Cancel the authenticated user's active subscription.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**

```json
{
  "userId": "...",
  "planId": "basic",
  "status": "cancelled"
}
```

---

### Stripe Checkout

Payments are handled via **Stripe Checkout Sessions** (one-time payment mode). The flow is:

1. Client calls `POST /subscription/checkout` → receives a Stripe-hosted checkout URL
2. User completes payment on Stripe's page
3. Stripe sends a `checkout.session.completed` webhook to `POST /stripe/webhook`
4. The subscription status updates from `pending` → `active` in MongoDB

#### `POST /subscription/checkout`

Create a Stripe Checkout Session for the given plan.

**Headers:** `Authorization: Bearer <token>`

**Request body:**

```json
{
  "planId": "basic",
  "successUrl": "https://yourapp.com/success",
  "cancelUrl": "https://yourapp.com/cancel"
}
```

Valid `planId` values: `basic`, `standard`, `premium`

**Response `201`:**

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Redirect the user to `url` to complete payment.

---

#### `POST /stripe/webhook`

Stripe webhook endpoint. **Do not call this directly** — it is called by Stripe after a successful payment.

Requires the raw request body and a valid `stripe-signature` header. Register this URL in the Stripe Dashboard under **Developers → Webhooks**, listening for the `checkout.session.completed` event.

**Local development with ngrok:**

```bash
ngrok http 3000
# Use the generated https URL as your webhook endpoint:
# https://xxxx.ngrok-free.app/stripe/webhook
```

Copy the webhook signing secret shown in the Stripe Dashboard into your `.env` as `STRIPE_WEBHOOK_SECRET`.

**Test cards (Stripe test mode):**

| Region | Card number | Expiry | CVC |
|---|---|---|---|
| Global | `4242 4242 4242 4242` | Any future (e.g. `12/34`) | Any 3 digits |
| India | `4000 0035 6000 0008` | Any future (e.g. `12/34`) | Any 3 digits |

---

### Testing the Stripe Checkout Flow end-to-end

**Prerequisites:** server running on port 3000, ngrok tunnelling to it, webhook registered in Stripe Dashboard.

**1. Register and login:**

```bash
curl -s -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
# → copy the access_token from the response
```

**2. Create a Checkout Session:**

```bash
curl -s -X POST http://localhost:3000/subscription/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -d '{
    "planId": "basic",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
  }'
# → returns { "url": "https://checkout.stripe.com/..." }
```

**3. Complete payment:**

Open the `url` in a browser. Use a test card from the table above. Submit the form.

**4. Verify the subscription is now active:**

```bash
curl -s http://localhost:3000/subscription \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
# → status should be "active" once Stripe fires the webhook
```

---

### Admin

Admin routes require a JWT token **and** the `admin` role.

#### `GET /admin/subscriptions`

Retrieve all subscriptions across all users.

**Headers:** `Authorization: Bearer <admin_token>`

**Response `200`:**

```json
[
  {
    "userId": "...",
    "planId": "premium",
    "status": "active",
    "startDate": "2026-04-01T00:00:00.000Z"
  }
]
```

---

## Postman Collection

The full Postman workspace with all requests, example payloads, and environments is publicly available:

**[https://www.postman.com/dheereshag/upcover](https://www.postman.com/dheereshag/upcover)**

To use it:

1. Open the link above in Postman (web or desktop app).
2. Fork the collection into your own workspace, or click **Run in Postman**.
3. Set the `baseUrl` environment variable to `http://localhost:3000`.
4. Register a user via `POST /register`, copy the returned `access_token`, and set it as the `token` environment variable — all authenticated requests pick it up automatically.

---

## Swagger Docs

Interactive API documentation is available at:

```
http://localhost:3000/api
```

---

## Running Tests

```bash
# Unit tests
pnpm run test

# Unit tests in watch mode
pnpm run test:watch

# e2e tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```
