# SMIT Market

A student marketplace for buying and selling second-hand items on campus.
Backend: Go, Gin, GORM, SQLite, JWT, bcrypt. Frontend: React, Vite, Tailwind, Axios, React Router, Lucide.

## Run the backend (needs Go 1.21+)
    cd backend
    go mod tidy
    go run .
Runs on http://localhost:8080. The SQLite file `smitmarket.db` and the `uploads/` folder are created automatically.
Optional: set `JWT_SECRET` to your own secret.

## Run the frontend (needs Node 18+)
    cd frontend
    npm install
    npm run dev
Open http://localhost:5173. Vite proxies `/api` and `/uploads` to the backend.

## Demo data
On first run, 4 listings labelled "DEMO" are added under a demo account:
`demo@smitmarket.local` / `demo1234` (their contact number is a placeholder).

## How buyers contact sellers
Sellers enter a WhatsApp number (or email). Logged-in buyers get one-tap buttons: Chat on WhatsApp
(with a ready-made message naming the item and price), Call, Email and Copy. No in-app chat is built, as per the spec.

## Production-minded features
- Pagination (`page`, `limit`, `X-Total-Count` header), debounced filters, skeleton loaders, toasts, saved items (stored in the browser)
- Rate limiting on login/register, security headers, image content checking, input length limits, `/api/health`
- Always set `JWT_SECRET` to a long random value before sharing the app
