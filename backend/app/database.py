import logging
from typing import Dict, Any, List, Optional
from .supabase_client import supabase
from .db_helpers import run_aggregate
import uuid
import re
from datetime import datetime

logger = logging.getLogger("jannetra.database")

def _to_comparable(val):
    if val is None:
        return ""
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, (int, float)):
        return val
    return str(val)

class SupabaseCursorAdapter:
    def __init__(self, table_name: str, query: Dict[str, Any], projection: Dict[str, Any] = None):
        self.table_name = table_name
        self.query = query or {}
        self.projection = projection
        self._sort = None
        self._limit = None
        self._skip = None
        self._iter_data = None
        self._iter_idx = 0

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            self._sort = key_or_list
        else:
            self._sort = [(key_or_list, direction)]
        return self
    
    def skip(self, skip: int):
        self._skip = skip
        return self

    def limit(self, limit: int):
        self._limit = limit
        return self

    def __aiter__(self):
        self._iter_data = None
        self._iter_idx = 0
        return self

    async def __anext__(self):
        if self._iter_data is None:
            self._iter_data = await self.to_list()
        if self._iter_idx < len(self._iter_data):
            val = self._iter_data[self._iter_idx]
            self._iter_idx += 1
            return val
        raise StopAsyncIteration
        
    async def to_list(self, length: Optional[int] = None):
        # Fetch data and filter in memory to properly support mongo syntax ($in, $ne, $gte, etc.)
        try:
            req = supabase.table(self.table_name).select("*")
            res = req.execute()
            data = res.data or []
        except Exception as e:
            logger.warning(f"Supabase query error on table '{self.table_name}': {e}")
            data = []
        
        filtered = [row for row in data if self._matches(row, self.query)]
                
        if self._sort:
            for sort_k, sort_d in reversed(self._sort):
                actual_k = "created_at" if sort_k == "_id" else sort_k
                filtered.sort(key=lambda x: _to_comparable(x.get(actual_k, x.get(sort_k, 0))), reverse=(sort_d == -1))
        
        if self._skip:
            filtered = filtered[self._skip:]

        lim = self._limit if self._limit is not None else length
        if lim is not None and isinstance(lim, int) and lim > 0:
            filtered = filtered[:lim]
            
        return filtered

    def _matches(self, row: dict, query: dict) -> bool:
        """Recursively evaluate a MongoDB-style query against a row dict."""
        for k, v in query.items():
            # Handle top-level logical operators
            if k == "$and":
                if not all(self._matches(row, sub) for sub in v):
                    return False
            elif k == "$or":
                if not any(self._matches(row, sub) for sub in v):
                    return False
            elif k == "$nor":
                if any(self._matches(row, sub) for sub in v):
                    return False
            elif isinstance(v, dict):
                row_val = row.get(k)
                if not self._eval_operators(row_val, v):
                    return False
            else:
                if row.get(k) != v:
                    return False
        return True

    def _eval_operators(self, row_val: Any, ops: dict) -> bool:
        """Evaluate a dict of operators ($ne, $in, $gte, etc.) against row_val."""
        for op, cmp in ops.items():
            if op == "$exists":
                if cmp and row_val is None:
                    return False
                if not cmp and row_val is not None:
                    return False
            elif op == "$ne":
                if row_val == cmp:
                    return False
            elif op == "$in":
                if row_val not in cmp:
                    return False
            elif op == "$nin":
                if row_val in cmp:
                    return False
            elif op == "$gte":
                if row_val is None or _to_comparable(row_val) < _to_comparable(cmp):
                    return False
            elif op == "$gt":
                if row_val is None or _to_comparable(row_val) <= _to_comparable(cmp):
                    return False
            elif op == "$lte":
                if row_val is None or _to_comparable(row_val) > _to_comparable(cmp):
                    return False
            elif op == "$lt":
                if row_val is None or _to_comparable(row_val) >= _to_comparable(cmp):
                    return False
            elif op == "$regex":
                if row_val is None or not cmp:
                    return False
                try:
                    pattern = cmp if hasattr(cmp, "search") else str(cmp)
                    flags = re.IGNORECASE if ops.get("$options", "") == "i" else 0
                    if not re.search(pattern, str(row_val), flags):
                        return False
                except Exception:
                    pass
            # Unknown operators are silently ignored (graceful degradation)
        return True




def _serialize_dates(obj):
    if isinstance(obj, dict):
        return {k: _serialize_dates(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_serialize_dates(v) for v in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj


class SupabaseCollectionAdapter:
    def __init__(self, table_name: str):
        self.table_name = table_name

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cursor = SupabaseCursorAdapter(self.table_name, query)
        res = await cursor.to_list(1)
        return res[0] if res else None

    async def insert_one(self, doc: Dict[str, Any]) -> Any:
        if "id" not in doc:
            doc["id"] = str(uuid.uuid4())
        if "_id" in doc:
            del doc["_id"]
        doc = _serialize_dates(doc)
        inserted_id = doc.get("id")
        
        clean_doc = dict(doc)
        for _ in range(40): # Allow stripping unmigrated schema fields
            try:
                res = supabase.table(self.table_name).insert(clean_doc).execute()
                if res.data:
                    inserted_id = res.data[0].get("id", inserted_id)
                break
            except Exception as e:
                err_str = str(e)
                if "Could not find the" in err_str and "column" in err_str:
                    col_match = re.search(r"Could not find the '([^']+)' column", err_str)
                    if col_match:
                        missing_col = col_match.group(1)
                        clean_doc.pop(missing_col, None)
                        continue
                logger.warning(f"Supabase insert notice on table '{self.table_name}': {e}")
                break

        class InsertOneResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertOneResult(inserted_id)

    async def insert_many(self, docs: List[Dict[str, Any]]) -> Any:
        for doc in docs:
            if "id" not in doc: doc["id"] = str(uuid.uuid4())
            if "_id" in doc: del doc["_id"]
        docs = _serialize_dates(docs)
        inserted_ids = [d["id"] for d in docs]
        
        if docs:
            clean_docs = [dict(d) for d in docs]
            for _ in range(40):
                try:
                    res = supabase.table(self.table_name).insert(clean_docs).execute()
                    if res.data:
                        inserted_ids = [d.get("id") for d in res.data]
                    break
                except Exception as e:
                    err_str = str(e)
                    if "Could not find the" in err_str and "column" in err_str:
                        col_match = re.search(r"Could not find the '([^']+)' column", err_str)
                        if col_match:
                            missing_col = col_match.group(1)
                            for cd in clean_docs:
                                cd.pop(missing_col, None)
                            continue
                    logger.warning(f"Supabase insert_many notice on table '{self.table_name}': {e}")
                    break

        class InsertManyResult:
            def __init__(self, inserted_ids):
                self.inserted_ids = inserted_ids
        return InsertManyResult(inserted_ids)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], **kwargs) -> Any:
        data = update.get("$set", update)
        data = _serialize_dates(data)
        
        clean_data = dict(data)
        for _ in range(40):
            try:
                if kwargs.get("upsert"):
                    upsert_data = {**{k: v for k, v in query.items() if not isinstance(v, dict)}, **clean_data}
                    req = supabase.table(self.table_name).upsert(upsert_data)
                else:
                    req = supabase.table(self.table_name).update(clean_data)
                    for k, v in query.items():
                        if not isinstance(v, dict):
                            req = req.eq(k, v)
                req.execute()
                break
            except Exception as e:
                err_str = str(e)
                if "Could not find the" in err_str and "column" in err_str:
                    col_match = re.search(r"Could not find the '([^']+)' column", err_str)
                    if col_match:
                        missing_col = col_match.group(1)
                        clean_data.pop(missing_col, None)
                        continue
                logger.warning(f"Supabase update notice on table '{self.table_name}': {e}")
                break

        class UpdateResult:
            def __init__(self):
                self.modified_count = 1
        return UpdateResult()
        
    async def update_many(self, query: Dict[str, Any], update: Dict[str, Any], **kwargs) -> Any:
        return await self.update_one(query, update, **kwargs)

    async def delete_one(self, query: Dict[str, Any]) -> Any:
        try:
            req = supabase.table(self.table_name).delete()
            for k, v in query.items():
                if not isinstance(v, dict):
                    req = req.eq(k, v)
            req.execute()
        except Exception as e:
            logger.warning(f"Supabase delete error on table '{self.table_name}': {e}")
        class DeleteResult:
            def __init__(self):
                self.deleted_count = 1
        return DeleteResult()

    async def delete_many(self, query: Dict[str, Any]) -> Any:
        return await self.delete_one(query)

    async def count_documents(self, query: Dict[str, Any]) -> int:
        cursor = SupabaseCursorAdapter(self.table_name, query)
        res = await cursor.to_list()
        return len(res)

    def find(self, query: Dict[str, Any] = None, *args, **kwargs):
        if query is None:
            query = {}
        projection = args[0] if args else kwargs.get("projection")
        return SupabaseCursorAdapter(self.table_name, query, projection=projection)

    def aggregate(self, pipeline: List[Dict[str, Any]]):
        class AggregationCursor:
            def __init__(self, table, p):
                self.table = table
                self.p = p
            async def to_list(self, length: Optional[int] = None):
                return await run_aggregate(supabase, self.table, self.p, length)
        return AggregationCursor(self.table_name, pipeline)


# Database Collection Adapters (Supabase / PostgreSQL)
users_collection              = SupabaseCollectionAdapter("users")
articles_collection           = SupabaseCollectionAdapter("articles")
news_articles_collection      = SupabaseCollectionAdapter("news_articles")
sources_collection            = SupabaseCollectionAdapter("sources")
alerts_collection             = SupabaseCollectionAdapter("alerts")
detection_results_collection  = SupabaseCollectionAdapter("detection_results")
gri_scores_collection         = SupabaseCollectionAdapter("governance_risk_scores")
sentiment_records_collection  = SupabaseCollectionAdapter("sentiment_records")
resolutions_collection        = SupabaseCollectionAdapter("resolutions")
signal_problems_collection    = SupabaseCollectionAdapter("signal_problems")
system_metrics_collection     = SupabaseCollectionAdapter("system_metrics")
community_reviews_collection  = SupabaseCollectionAdapter("community_reviews")
activity_logs_collection      = SupabaseCollectionAdapter("activity_logs")
citizen_reports_collection    = SupabaseCollectionAdapter("citizen_reports")

# Generic db dictionary interface
class DatabaseAccessor:
    def __getitem__(self, name: str) -> SupabaseCollectionAdapter:
        return SupabaseCollectionAdapter(name)

db = DatabaseAccessor()
