"""SQLAlchemy engine / session / Base + FastAPI dependency."""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

_is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)

if _is_sqlite:
    # SQLite's built-in lower()/upper() are ASCII-only, so case-insensitive
    # search over Cyrillic/Kazakh names fails. Override with Python's Unicode-aware
    # implementations so func.lower() in queries matches what Python produces.
    @event.listens_for(engine, "connect")
    def _register_unicode_case(dbapi_conn, _record):
        dbapi_conn.create_function("lower", 1, lambda s: s.lower() if s else s)
        dbapi_conn.create_function("upper", 1, lambda s: s.upper() if s else s)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
