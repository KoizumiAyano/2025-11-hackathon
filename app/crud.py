from sqlalchemy.orm import Session
from . import models, schemas

# --- Create ---
def create_post(db: Session, post: schemas.PostCreate):
    db_post = models.Post(
        name=post.name,
        content=post.content,
        parm_unluckey=post.parm_unluckey,
        user_id=post.user_id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

# --- Read ---
def get_posts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Post).filter(models.Post.deleted == False).order_by(models.Post.create_date.desc()).offset(skip).limit(limit).all()

def get_post_by_id(db: Session, post_id: int):
    return db.query(models.Post).filter(models.Post.post_id == post_id, models.Post.deleted == False).first()

# --- Update ---
def increment_like(db: Session, post_id: int):
    db_post = get_post_by_id(db, post_id)
    if db_post:
        db_post.like_count += 1
        db.commit()
        db.refresh(db_post)
    return db_post

# --- Delete ---
def logically_delete_post(db: Session, post_id: int):
    db_post = get_post_by_id(db, post_id)
    if db_post:
        db_post.deleted = True
        db.commit()
        db.refresh(db_post)
    return db_post