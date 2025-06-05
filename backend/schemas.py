# schemas.py
from pydantic import BaseModel, Field
from typing import Optional

# --- Schemas para autenticación ---

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    is_admin: Optional[int] = bool

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None


# --- Schemas para usuario y sus settings ---

class UserOut(BaseModel):
    id: int
    username: str
    is_admin: int

    class Config:
        orm_mode = True

class UserSettingsBase(BaseModel):
    font_size: str = "16"
    font_family: str = "Arial"
    text_color: str = "#000000"
    background_color: str = "#ffffff"
    rate: str = "1"
    pitch: str = "1"
    volume: str = "1"

class UserSettingsCreate(UserSettingsBase):
    pass

class UserSettingsUpdate(UserSettingsBase):
    pass

class UserSettingsOut(UserSettingsBase):
    user_id: int

    class Config:
        orm_mode = True
