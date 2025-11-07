from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # [修正点] インポート
from sqlalchemy.orm import Session
from typing import List

from . import crud, models, schemas
from .database import SessionLocal, engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- [修正点] CORS設定をここに追加 ---
origins = [
    # フロントエンドのURL (VSCode Live Serverなど)
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "null",  # ローカルファイル(file://)からのアクセス用
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- CORS設定ここまで ---

# 【優先度：高】投稿機能
@app.post("/posts/", response_model=schemas.Post)
def create_new_post(post: schemas.PostCreate, db: Session = Depends(get_db)):
    return crud.create_post(db=db, post=post)

# 【優先度：高】いいね機能
@app.put("/posts/{post_id}/like", response_model=schemas.Post)
def like_post(post_id: int, db: Session = Depends(get_db)):
    db_post = crud.increment_like(db, post_id)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return db_post

# 【優先度：高】削除機能
@app.delete("/posts/{post_id}", response_model=schemas.Post)
def delete_post(post_id: int, db: Session = Depends(get_db)):
    db_post = crud.logically_delete_post(db, post_id)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return db_post

# 【TL用】投稿一覧取得機能
@app.get("/posts/", response_model=List[schemas.Post])
def read_posts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    posts = crud.get_posts(db, skip=skip, limit=limit)
    return posts

@app.get("/")
def read_root():
    return {"message": "HoneyDrop APIへようこそ"}
