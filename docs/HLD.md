# High Level Design

## What the system does

A buyer creates an RFQ and sets the bidding window plus the forced close time. Suppliers
submit quotes openly and can keep improving their price. If a bid arrives close to the
current close time, the auction close time moves forward by a fixed amount. It is always
capped at the forced close time.

The UI is a React single page app. It talks to a FastAPI backend over JSON, and the backend
stores everything in a SQLite file.

## Architecture

```text
+---------------------------+
| Browser                   |
| React SPA                 |
| http://localhost:5173     |
+------------+--------------+
             |
             | /api request (Vite dev proxy)
             v
+---------------------------+
| FastAPI application       |
| http://127.0.0.1:8000     |
|                           |
|  auth     rfqs            |
|  auctions bids            |
|  activities               |
|                           |
|  SQLAlchemy models        |
+------------+--------------+
             |
             v
+---------------------------+
| SQLite                    |
| backend/rfq_auction.db    |
+---------------------------+
```

In development Vite runs on port 5173 and proxies `/api` to uvicorn on port 8000, so the
browser only talks to one origin.

## Main parts

Backend:

- `app/api/endpoints/auth.py` - login, JWT creation and `/api/auth/me`.
- `app/api/endpoints/rfqs.py` - RFQ create/list/update, auction settings, triggers and
  the start/close actions.
- `app/api/endpoints/bids.py` - bid validation, rankings, extension logic and activity
  records.
- `app/api/endpoints/auctions.py` - listing and detail responses used by the UI.
- `app/api/endpoints/activities.py` - recent activity feed across all auctions.
- `app/models` - SQLAlchemy tables.
- `app/schemas` - Pydantic request/response models and field validation.

Frontend:

- `Login` - sign in as buyer or supplier.
- `Dashboard` - buyer's own RFQs.
- `RFQCreate` - create an RFQ and its auction configuration.
- `AuctionListing` - all auctions with lowest bid, close times and status.
- `AuctionDetail` - rankings, all bids by price, configuration and activity log.
- `SupplierBid` - quote submission form.
- `ActivityFeed` - latest activity for every visible auction.

## Database

There are six tables: `users`, `rfqs`, `bids`, `auction_settings`, `auction_triggers` and
`auction_activity`. Column details and relationships are in `DATABASE_SCHEMA.md`.

## Bidding and extension flow

1. Supplier submits a bid with carrier name and charges.
2. Backend checks that the auction is active and that the current time is between the bid
   start and the current close time.
3. The bid is saved and a `bid_placed` activity entry is written.
4. The backend recalculates the latest bid per supplier, ordered by total amount.
5. If the order of the existing suppliers changed, a `rank_changed` activity entry is
   written. The first bid only creates the ranking, so it is not treated as a change.
6. If the bid is inside the trigger window, the enabled triggers are checked:
   - `last_bid`: a bid was placed in the last X minutes.
   - `rank_change`: the supplier order changed.
   - `l1_change`: the cheapest supplier changed.
7. If at least one trigger fired and the extension limit is not reached, the close time
   becomes `min(current close + Y, forced close)`.
8. An `extension` activity entry is written with the reason, the triggers that fired and
   the old and new close times.

A bid is rejected once the current close time or the forced close time has passed. Only a
running auction is moved to `closed` or `forced_closed`; a normally closed auction stays
closed even after the forced close time passes.

## Ranking rules

- Only the newest bid of each supplier is used for the ranking.
- Bids are ordered by total amount, then submission time, then id.
- The details page also returns every bid ever placed, ordered by price.

## Main API endpoints

```text
POST /api/auth/login
GET  /api/auth/me

POST /api/rfqs/
GET  /api/rfqs/
POST /api/rfqs/{id}/settings
POST /api/rfqs/{id}/triggers
POST /api/rfqs/{id}/start

GET  /api/auctions/
GET  /api/auctions/{id}
GET  /api/auctions/{id}/activities
GET  /api/activities/

POST /api/bids/
```

## Assumptions and limitations

- Every RFQ is a British auction. There is no switch to turn the auction behaviour off.
- Extensions are checked when a bid is submitted. There is no background timer.
- The first bid creates the ranking and does not count as a rank or L1 change.
- A supplier can submit a new bid even if it is not lower than their previous bid. The
  ranking still uses their latest bid.
- Each RFQ has one settings row and one set of triggers.

## Validation and security

- Passwords are hashed with bcrypt and are never returned by the API.
- Business endpoints require a JWT in the `Authorization` header.
- Only suppliers can submit bids; only buyers can create RFQs.
- Pydantic validates field ranges and lengths. The forced close time must be later than
  the bid close time, and this is also enforced by a database check constraint.
- Auction extensions are capped at the forced close time by the extension calculation.
