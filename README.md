# British Auction in RFQ System

A full-stack RFQ platform where buyers request quotes and suppliers compete for the order.
Bidding follows the British auction model: prices only move down, rankings are public, and
the closing time extends while suppliers are still bidding. The auction can never run past
the forced close time set by the buyer.

Backend is FastAPI + SQLAlchemy with SQLite. Frontend is React (Vite) with Tailwind CSS.

## Features

- Buyers create RFQs with a reference ID, description, bid window, forced close time and
  pickup/service date.
- Suppliers submit quotes with carrier name, freight, origin and destination charges,
  transit time and validity. The total is calculated on the server.
- Live L1/L2/L3 ranking built from each supplier's latest bid.
- Automatic extension when a bid lands inside the trigger window before closing.
- Three configurable triggers: last bid, any rank change, L1 change.
- Optional cap on the number of extensions.
- Full bid history, plus an activity log recording every bid, rank change and extension.
- JWT login with buyer and supplier roles.

## Tech stack

| Layer | Used |
|---|---|
| API | FastAPI, Uvicorn |
| ORM / DB | SQLAlchemy 2, SQLite |
| Validation | Pydantic v2 |
| Auth | JWT (python-jose), bcrypt |
| UI | React 18, React Router 6, Tailwind CSS 3 |
| Build | Vite 5 |
| HTTP client | Axios |
| Icons | lucide-react |

## Getting started

You need Python 3.10+ and Node.js 18+.

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start it from inside `backend/`, because the SQLite path is relative
(`sqlite:///./rfq_auction.db`).

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend on port 8000.

API docs are at http://127.0.0.1:8000/docs.

### Demo accounts

Seeded automatically on first backend start:

| Username | Password | Role |
|---|---|---|
| `buyer1` | `password123` | Buyer |
| `supplier1` | `password123` | Supplier |
| `supplier2` | `password123` | Supplier |
| `supplier3` | `password123` | Supplier |

The committed `backend/rfq_auction.db` already contains these users and a few sample
auctions. Delete the file if you want a clean database; the tables and users are recreated
on the next start.

## How the auction works

Each RFQ has an extension window `X` (minutes), an extension duration `Y` (minutes), and an
optional maximum number of extensions.

When a bid arrives, the server checks the time left until the current close time. If the bid
is inside the window and at least one enabled trigger fires, the close time moves forward:

```text
0 < current_close_time - now <= X      # inside the window
new_close_time = min(current_close_time + Y, forced_close_time)
```

| Trigger | Fires when |
|---|---|
| `last_bid` | A bid was placed within the last X minutes before closing |
| `rank_change` | The order of suppliers changed after this bid |
| `l1_change` | The cheapest supplier changed after this bid |

A bid is accepted only while the RFQ is active, the bid window has opened, and neither the
current close time nor the forced close time has passed. Each bid can cause at most one
extension, and extensions stop once the maximum is reached or the forced close time is hit.

Rankings use the newest bid per supplier, sorted by total, then submission time, then id. The
first bid only creates the ranking, so it does not count as a rank change or an L1 change.

Auction status is updated whenever the auction is read (listing, detail, or a new bid). There
is no background scheduler, so a closed auction is reconciled on the next request.

## Project structure

```text
backend/
  app/
    api/           routes and dependencies
    core/          settings and security helpers
    db/            engine, session, Base
    models/        SQLAlchemy tables
    schemas/       request/response models
    utils/         time helpers
  requirements.txt
  rfq_auction.db
frontend/
  src/
    components/    layout and activity details
    context/       auth context
    pages/         login, dashboard, rfq create, auctions, bid, activity
  vite.config.js
docs/
  HLD.md
  DATABASE_SCHEMA.md
```

## API

All routes are under `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Sign in, returns a JWT |
| `GET` | `/auth/me` | Current user |
| `POST` | `/rfqs/` | Create an RFQ |
| `GET` | `/rfqs/` | List RFQs |
| `GET` | `/rfqs/{id}` | RFQ detail |
| `PATCH` | `/rfqs/{id}` | Edit a draft RFQ |
| `POST` | `/rfqs/{id}/settings` | Set X, Y and max extensions |
| `POST` | `/rfqs/{id}/triggers` | Choose the enabled triggers |
| `POST` | `/rfqs/{id}/start` | Start the auction |
| `POST` | `/rfqs/{id}/close` | Close the auction early |
| `GET` | `/auctions/` | Listing with lowest bid, close times and status |
| `GET` | `/auctions/{id}` | Rankings, all bids, settings and activity |
| `GET` | `/auctions/{id}/activities` | Activity for one auction |
| `GET` | `/activities/` | Recent activity across visible auctions |
| `POST` | `/bids/` | Submit a quote |

## Database

Six tables: `users`, `rfqs`, `bids`, `auction_settings`, `auction_triggers` and
`auction_activity`. Tables are created by SQLAlchemy on startup. Column details and
relationships are in [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md). The design overview
is in [docs/HLD.md](docs/HLD.md).

## Notes

- Every RFQ uses the British auction rules; there is no toggle for a fixed-price RFQ.
- Timestamps are stored in UTC. The UI converts them to local time.
- Extensions are evaluated when a bid is submitted, so an auction with no further bids
  simply closes at its current close time.
- SQLite keeps the project self-contained, but it does not provide row-level locking for
  simultaneous bid writes.

## Troubleshooting

If PowerShell refuses to run `npm` with "running scripts is disabled on this system", either
allow local scripts once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

or call the batch wrapper directly:

```powershell
npm.cmd run dev
```

Port already in use? Stop the old process:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen |
  Select-Object -ExpandProperty OwningProcess |
  ForEach-Object { Stop-Process -Id $_ -Force }
```
