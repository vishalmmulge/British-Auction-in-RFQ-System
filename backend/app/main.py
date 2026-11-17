from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.endpoints import auth, rfqs, auctions, bids, activities

app = FastAPI(title="British Auction in RFQ System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(rfqs.router, prefix="/api/rfqs", tags=["rfqs"])
app.include_router(auctions.router, prefix="/api/auctions", tags=["auctions"])
app.include_router(bids.router, prefix="/api/bids", tags=["bids"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])


@app.get("/")
def root():
    return {"message": "British Auction in RFQ System API"}


@app.get("/health")
def health():
    return {"status": "ok"}


def ensure_schema():
    """Add columns that create_all() does not add to existing tables."""
    inspector = inspect(engine)
    if "bids" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("bids")}
    if "carrier_name" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE bids ADD COLUMN carrier_name VARCHAR(100)"))


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)
    ensure_schema()

    from app.db.session import SessionLocal
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        for username, email, role in [
            ("buyer1", "buyer1@example.com", UserRole.BUYER),
            ("supplier1", "supplier1@example.com", UserRole.SUPPLIER),
            ("supplier2", "supplier2@example.com", UserRole.SUPPLIER),
            ("supplier3", "supplier3@example.com", UserRole.SUPPLIER),
        ]:
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                db.add(User(
                    email=email,
                    username=username,
                    password_hash=get_password_hash("password123"),
                    role=role,
                    is_active=True,
                ))
        db.commit()
    finally:
        db.close()