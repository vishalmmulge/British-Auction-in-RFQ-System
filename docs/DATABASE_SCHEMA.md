# Database Schema

SQLite database at `backend/rfq_auction.db`, accessed through SQLAlchemy.

## Relationships

- `users.id` is referenced by `rfqs.buyer_id` and `bids.supplier_id`.
- `rfqs.id` is referenced by `bids.rfq_id`, `auction_settings.rfq_id`,
  `auction_triggers.rfq_id` and `auction_activity.rfq_id`.
- `bids.id` is referenced by `auction_activity.bid_id`.
- `users.id` is also stored in `auction_activity.actor_id`, but without a foreign key.

## users

Stores buyers and suppliers. The `role` column decides what the user can do.

| Column | Type | Constraints |
|---|---|---|
| id | integer | primary key |
| email | varchar(255) | unique, not null |
| username | varchar(100) | unique, not null, indexed |
| password_hash | varchar(255) | not null |
| role | varchar | not null, `buyer` or `supplier` |
| is_active | boolean | not null, default true |
| created_at | datetime | not null, default now |

## rfqs

One row per RFQ / auction.

| Column | Type | Constraints |
|---|---|---|
| id | integer | primary key |
| reference_id | varchar(100) | unique, not null, indexed |
| buyer_id | integer | foreign key to users.id, not null |
| name | varchar(255) | not null |
| description | text | nullable |
| bid_start_time | datetime | not null |
| bid_close_time | datetime | not null |
| forced_close_time | datetime | not null |
| pickup_service_date | datetime | not null |
| status | varchar | not null, default `draft` |
| current_close_time | datetime | not null |
| extension_count | integer | not null, default 0 |
| created_at | datetime | not null, default now |
| updated_at | datetime | not null, default now |

Status values: `draft`, `active`, `closed`, `forced_closed`, `cancelled`.

Check constraints:

- `bid_close_time > bid_start_time`
- `forced_close_time > bid_close_time`

## bids

Every submitted quote is stored as a new row. Earlier bids are not updated.

| Column | Type | Constraints |
|---|---|---|
| id | integer | primary key |
| rfq_id | integer | foreign key to rfqs.id, not null |
| supplier_id | integer | foreign key to users.id, not null |
| carrier_name | varchar(100) | nullable in the table, required by the API |
| freight_charges | numeric(12,2) | not null, >= 0 |
| origin_charges | numeric(12,2) | not null, >= 0 |
| destination_charges | numeric(12,2) | not null, >= 0 |
| total_amount | numeric(12,2) | not null |
| transit_time | varchar(100) | not null |
| quote_validity | varchar(100) | not null |
| submitted_at | datetime | not null, default now, indexed |

`total_amount` is calculated by the backend as freight + origin + destination charges.

Indexes:

- `(rfq_id, supplier_id, submitted_at)`
- `(rfq_id, total_amount)`

## auction_settings

One row per RFQ.

| Column | Type | Constraints |
|---|---|---|
| id | integer | primary key |
| rfq_id | integer | foreign key to rfqs.id, unique, not null |
| extension_window_minutes | integer | not null (X) |
| extension_duration_minutes | integer | not null (Y) |
| max_extensions | integer | nullable, null means no limit |
| created_at | datetime | not null, default now |
| updated_at | datetime | not null, default now |

## auction_triggers

Enabled extension triggers for an RFQ. A row exists only when the trigger is turned on.

| Column | Type | Constraints |
|---|---|---|
| id | integer | primary key |
| rfq_id | integer | foreign key to rfqs.id, not null |
| trigger_type | varchar(50) | not null |

Trigger values: `last_bid`, `rank_change`, `l1_change`.

`(rfq_id, trigger_type)` is unique.

## auction_activity

Activity log for an auction. Used by the details page and the activity feed.

| Column | Type | Constraints |
|---|---|---|
| id | integer | primary key |
| rfq_id | integer | foreign key to rfqs.id, not null |
| bid_id | integer | foreign key to bids.id, nullable |
| actor_id | integer | nullable |
| activity_type | varchar(50) | not null |
| details | json | nullable |
| created_at | datetime | not null, default now |

Activity types and their `details`:

- `bid_placed`: `{ carrier_name, total_amount, submitted_at }`
- `rank_changed`: `{ previous_l1, new_l1 }`
- `extension`: `{ reason, trigger_types, extension_window_minutes,
  extension_duration_minutes, capped_at_forced_close, old_close_time, new_close_time,
  forced_close_time }`

The `reason` field is the readable text shown in the UI. `trigger_types` keeps the list of
trigger names that fired.

## A few notes

- `current_close_time` starts as `bid_close_time`. It is the value that moves when an
  extension happens.
- `carrier_name` was added after the first version of the table, so it is nullable at the
  database level. The bid request still requires it.
- `auction_activity.details` is JSON because the three event types store different fields.
- Rankings use the newest bid per supplier. Older bids only appear in the full bid history.
