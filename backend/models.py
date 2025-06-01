# models.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    settings = relationship("UserSettings", back_populates="owner", uselist=False)
    # uselist=False porque cada usuario tendrá un único registro en UserSettings


class UserSettings(Base):
    __tablename__ = "user_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # Ajustes de texto
    font_size = Column(String(10), default="16")       # ejemplo: "16px"
    font_family = Column(String(50), default="Arial")
    text_color = Column(String(7), default="#000000")  # formato hex
    background_color = Column(String(7), default="#ffffff")
    
    # Ajustes de voz
    rate = Column(String(10), default="1")    # almacenamos como cadena para simplificar
    pitch = Column(String(10), default="1")
    
    owner = relationship("User", back_populates="settings")
