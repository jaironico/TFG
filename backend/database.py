# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Ruta de tu archivo SQLite (puede estar en la carpeta backend/)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db.sqlite3")

# create_engine y SessionLocal para SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite requiere esto
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class para los modelos
Base = declarative_base()
