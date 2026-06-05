# Customer Loyalty App

React Native + Node.js + PostgreSQL starter for storing customer points and redeeming rewards.

## Project Structure

```text
customer-loyalty/
  mobile/   Expo React Native app
  server/   Node.js Express API
```

## Features

- Create and search customers by phone number
- Add points from purchases
- Redeem available points
- View customer balance and transaction history
- PostgreSQL schema with auditable point ledger

## Quick Start

### 1. Database

Option A, with Docker:

```bash
docker compose up -d db
docker compose exec -T db psql -U postgres -d loyalty_app -f /app/server/db/migrations/001_init.sql
docker compose exec -T db psql -U postgres -d loyalty_app -f /app/server/db/seed.sql
```

Option B, with local PostgreSQL tools:

Create a PostgreSQL database:

```bash
createdb loyalty_app
```

Run the migration and seed:

```bash
psql -d loyalty_app -f server/db/migrations/001_init.sql
psql -d loyalty_app -f server/db/seed.sql
```

### 2. API

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The API runs on `http://localhost:4000`.

### 3. Mobile App

```bash
cd mobile
npm install
npm start
```

For Android emulator, keep `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` in `mobile/.env.example`.
For a physical phone, replace it with your computer LAN IP, for example:

```text
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
```

## Loyalty Rules

The starter uses:

- `1 point` for every `1000` purchase amount
- `1 point = 10` redemption value
- Customers cannot rede em more points than their current balance

You can change these values in `server/src/config/loyalty.ts`.
