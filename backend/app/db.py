from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from .core.config import get_settings
from .core.seed import seed_initial_data

settings = get_settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    if settings.load_seed:
        with Session(engine) as session:
            seed_initial_data(session)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

