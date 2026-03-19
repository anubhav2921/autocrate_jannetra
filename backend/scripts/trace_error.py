import sys
sys.path.append('c:/Users/vinu/jannetra11/project/backend')
from app.database import SessionLocal
from app.routes.location import get_location_dashboard

db = SessionLocal()
try:
    print(get_location_dashboard(state="Punjab", district="Amritsar", city="Amritsar", ward=None, db=db))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
