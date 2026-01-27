import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from app import models  # noqa: F401  # Ensure models are imported for metadata

config = context.config

# Configure Python logging from alembic.ini if present
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- DB URL selection policy ---
# We REQUIRE DATABASE_URL to be set to avoid accidentally migrating the wrong database.
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise RuntimeError(
        "DATABASE_URL no está definido. "
        "Abortando para evitar ejecutar migraciones sobre una base equivocada.\n"
        "Ejemplo:\n"
        "  export DATABASE_URL='postgresql+psycopg://user:pass@localhost:5432/dbname'\n"
        "  alembic upgrade head"
    )

# Force Alembic to use DATABASE_URL regardless of what's in alembic.ini
config.set_main_option("sqlalchemy.url", db_url)

# SQLModel metadata for autogenerate support
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine,
    though an Engine is acceptable here as well. By skipping the Engine creation
    we don't even need a DBAPI to be available.
    """
    url = config.get_main_option("sqlalchemy.url")

    print(">>>> USING DB URL (offline):", url, flush=True)

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    In this scenario we need to create an Engine and associate a connection with the context.
    """
    url = config.get_main_option("sqlalchemy.url")

    print(">>>> USING DB URL (online):", url, flush=True)

    connectable = engine_from_config(
        {"sqlalchemy.url": url},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

