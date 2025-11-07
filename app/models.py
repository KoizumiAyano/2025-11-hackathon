from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from .database import Base

class Post(Base):
    __tablename__ = "posts"

    post_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True) 
    name = Column(String(100), nullable=False)
    content = Column(String(500), nullable=False)
    like_count = Column(Integer, default=0)
    parm_unluckey = Column(Integer, nullable=False)
    create_date = Column(DateTime(timezone=True), server_default=func.now())
    deleted = Column(Boolean, default=False)