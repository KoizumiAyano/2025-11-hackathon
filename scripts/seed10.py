#!/usr/bin/env python3
"""Seed the local SQLite DB with 10 test posts.
Run: PYTHONPATH=. python3 scripts/seed10.py
"""
from app.database import SessionLocal, engine, Base
from app import models

Base.metadata.create_all(bind=engine)

def seed(n=10):
    db = SessionLocal()
    try:
        for i in range(1, n + 1):
            p = models.Post(
                name=f"サンプル{i}",
                content=f"ダミー投稿 {i}。これはテスト用データです。",
                parm_unluckey=(i % 5) + 1,
                like_count=(i * 3) % 7,
            )
            db.add(p)
        db.commit()
        count = db.query(models.Post).filter(models.Post.deleted == False).count()
        print(f"Inserted {n} posts. Total non-deleted posts in DB: {count}")
    finally:
        db.close()

if __name__ == '__main__':
    seed(10)
