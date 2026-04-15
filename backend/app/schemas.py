from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class CalculationBase(BaseModel):
    expression: str

class CalculationCreate(CalculationBase):
    pass

class CalculationResponse(CalculationBase):
    id: int
    result: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class AnalyticsResponse(BaseModel):
    total_calculations: int
    most_used_operator: Optional[str]
    calculations_per_day: dict[str, int]
