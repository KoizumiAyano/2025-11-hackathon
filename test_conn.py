import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
url = os.environ.get('DATABASE_URL')
print('DATABASE_URL=', url)
if not url:
    print('DATABASE_URL is not set')
    sys.exit(2)

try:
    engine = create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        r = conn.execute(text('SELECT 1'))
        val = r.scalar()
        print('SELECT 1 ->', val)
        if val == 1:
            print('OK: DB connection successful')
            sys.exit(0)
        else:
            print('Unexpected result from SELECT 1:', val)
            sys.exit(3)
except Exception as e:
    print('Connection error:', e)
    sys.exit(1)
