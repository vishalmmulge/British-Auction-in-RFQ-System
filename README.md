# British Auction in RFQ System

This is my submission for the British Auction in RFQ System assignment. A buyer creates an
RFQ, suppliers submit quotes, and the close time can move forward when bidding happens near
the end. It never goes past the forced close time.

I used FastAPI + SQLAlchemy + SQLite for the backend and React (Vite) + Tailwind for the
frontend.

## How to run

Backend:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server sends `/api` requests to port 8000.

## Test accounts

The backend creates these on first start.

```text
buyer1     / password123
supplier1  / password123
supplier2  / password123
supplier3  / password123
```

## What is implemented

- RFQ creation: reference ID, name, description, bid start, bid close, forced close and
  pickup/service date.
- Extension settings: trigger window X, extension duration Y, optional max extensions,
  and the three triggers (last bid, any rank change, L1 change).
- Quote form: carrier name, freight, origin and destination charges, transit time and quote
  validity. The total is calculated by the backend.
- Listing page: RFQ name/ID, lowest bid, current close, forced close and status.
- Details page: L1/L2/L3 rankings, all bids sorted by price, full quote details, auction
  configuration and the activity log with the reason for every extension.
- Login is role based. Buyers create RFQs, suppliers bid.

The HLD is in `docs/HLD.md` and the table design is in `docs/DATABASE_SCHEMA.md`.
