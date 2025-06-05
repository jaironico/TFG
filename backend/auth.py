# auth.py
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models, schemas
from database import SessionLocal, engine

# ------------------------------------------------
# 1) Configuración de hashing y JWT
# ------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "illustrious-secret-key")  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # Token válido 24 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ------------------------------------------------
# 2) Dependency: obtener BD session
# ------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------------------------------------
# 3) Funciones auxiliares para usuarios
# ------------------------------------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    hashed_pw = get_password_hash(user_in.password)
    new_user = models.User(
        username=user_in.username,
        hashed_password=hashed_pw,
        is_admin=getattr(user_in, "is_admin", 0)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    # Crear registro inicial de UserSettings:
    default_settings = models.UserSettings(user_id=new_user.id)
    db.add(default_settings)
    db.commit() 
    return new_user

def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    payload = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ------------------------------------------------
# 4) Obtener usuario actual a partir del token
# ------------------------------------------------
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception

    user = get_user_by_username(db, token_data.username)
    if user is None:
        raise credentials_exception
    return user

# ------------------------------------------------
# 5) Router de autenticación
# ------------------------------------------------
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_username(db, user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    user = create_user(db, user_in)
    return user

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña inválidos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.username}
    )
    return {"access_token": access_token, "token_type": "bearer"}