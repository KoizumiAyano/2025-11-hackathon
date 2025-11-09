from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PostCreate(BaseModel):
    name: str
    content: str
    parm_unluckey: int
    user_id: Optional[int] = None

class Post(BaseModel):
    post_id: int
    name: str
    content: str
    like_count: Optional[int] = 0
    parm_unluckey: int
    create_date: datetime
    
    class Config:
        orm_mode = True