import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
url = os.environ.get('DATABASE_URL')
print('Using DATABASE_URL=', url)
engine = create_engine(url, pool_pre_ping=True)
with engine.connect() as conn:
    try:
        res = conn.execute(text('SELECT * FROM posts ORDER BY 1 DESC LIMIT 10'))
        rows = res.fetchall()
        keys = res.keys()
        print('Columns:', keys)
        if not rows:
            print('No rows returned')
        else:
            for r in rows:
                # print as dict mapping column->value
                print({k: v for k, v in zip(keys, r)})
    except Exception as e:
        print('Error querying posts:', e)
