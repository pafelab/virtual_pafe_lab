from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # needed for SQLite + threads
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401  (register models)
    Base.metadata.create_all(bind=engine)
