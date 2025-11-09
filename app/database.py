import os
from dotenv import load_dotenv
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Read DATABASE_URL from environment. If not provided, fall back to a local sqlite file
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")


def _ensure_postgres_ssl(url: str) -> str:
    """If a Postgres-like URL is provided and sslmode isn't set, append sslmode=require.
    This is useful for Supabase which requires SSL.
    """
    if not url:
        return url
    lower = url.lower()
    if lower.startswith("postgres://") or lower.startswith("postgresql://"):
        if "sslmode=" not in lower:
            sep = "&" if "?" in url else "?"
            return url + sep + "sslmode=require"
    return url


SQLALCHEMY_DATABASE_URL = _ensure_postgres_ssl(SQLALCHEMY_DATABASE_URL)

# For sqlite we need the check_same_thread connect_arg; for Postgres we enable pool_pre_ping
connect_args = {}
engine_kwargs = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
else:
    # For Postgres (Supabase) use pool_pre_ping to avoid stale connections
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()