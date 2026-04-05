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
MONGODB_URI=mongodb://localhost:27017/upcover
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

| Variable         | Description                       | Default |
|------------------|-----------------------------------|---------|
| `PORT`           | Port the server listens on        | `3000`  |
| `MONGODB_URI`    | MongoDB connection string         | —       |
| `JWT_SECRET`     | Secret key for signing JWT tokens | —       |
| `JWT_EXPIRES_IN` | JWT token expiration duration     | `7d`    |

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
    "currency": "USD",
    "features": ["Up to 1 user", "Basic support", "10 GB storage"]
  },
  {
    "id": "standard",
    "name": "Standard",
    "price": 19.99,
    "currency": "USD",
    "features": ["Up to 5 users", "Priority support", "50 GB storage"]
  },
  {
    "id": "premium",
    "name": "Premium",
    "price": 39.99,
    "currency": "USD",
    "features": ["Unlimited users", "24/7 support", "500 GB storage"]
  }
]
```

---

### Subscriptions

All subscription routes require a valid JWT token.

#### `POST /subscription`

Create or update the authenticated user's subscription.

**Headers:** `Authorization: Bearer <token>`

**Request body:**

```json
{
  "planId": "basic"
}
```

Valid `planId` values: `basic`, `standard`, `premium`

**Response `201`:**

```json
{
  "userId": "...",
  "planId": "basic",
  "status": "active",
  "startDate": "2026-04-05T00:00:00.000Z"
}
```

---

#### `GET /subscription`

Get the authenticated user's current subscription.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**

```json
{
  "userId": "...",
  "planId": "standard",
  "status": "active",
  "startDate": "2026-04-05T00:00:00.000Z"
}
```

---

#### `POST /subscription/cancel`

Cancel the authenticated user's active subscription.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**

```json
{
  "message": "Subscription cancelled successfully"
}
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
