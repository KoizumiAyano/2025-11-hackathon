#!/usr/bin/env python3
"""Seed the local SQLite database with ~20 test posts.
Run: python3 scripts/seed_db.py
"""
from app.database import SessionLocal, engine, Base
from app import models


def seed(n=20):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Optional: clear existing non-deleted posts to avoid duplicates when re-running
        # Uncomment if you want idempotent behavior
        # db.query(models.Post).delete()
        # db.commit()

        for i in range(1, n + 1):
            p = models.Post(
                name=f"テスター{i}",
                content=f"テスト投稿 #{i} — これはサンプルの本文です。",
                parm_unluckey=((i - 1) % 5) + 1,
                like_count=(i % 7),
            )
            db.add(p)
        db.commit()

        count = db.query(models.Post).filter(models.Post.deleted == False).count()
        print(f"Inserted {n} posts. Total non-deleted posts in DB: {count}")
    finally:
        db.close()


if __name__ == '__main__':
    seed(20)
