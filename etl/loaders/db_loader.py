import json
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import Book, Base

class DBLoader:
    def __init__(self, db_url: str):
        self.engine = create_engine(db_url)
        self.Session = sessionmaker(bind=self.engine)
        
    def load(self, jsonl_file: str):
        if not Path(jsonl_file).exists():
            print("No processed file to load.")
            return
            
        with self.Session() as session:
            with open(jsonl_file, 'r') as f:
                for line in f:
                    data = json.loads(line)
                    # Simplified mapping for mock
                    b = Book(
                        title=data.get('title', 'Unknown'),
                        slug=data.get('title', 'Unknown').lower().replace(' ', '-'),
                        author=data.get('author'),
                        cefr_level_code=data.get('cefr_level_code', 'A1'),
                        origin='pipeline'
                    )
                    session.add(b)
            # Try to commit
            try:
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"Failed to load: {e}")
