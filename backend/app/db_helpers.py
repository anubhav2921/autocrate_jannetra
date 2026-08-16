import logging
from typing import List, Dict, Any

logger = logging.getLogger("jannetra.db_helpers")

async def run_aggregate(supabase_client, table_name: str, pipeline: List[Dict[str, Any]], limit: int = None) -> List[Dict[str, Any]]:
    """
    In-memory executor for MongoDB-style aggregation pipelines over Supabase data.
    Useful for migrating legacy code without rewriting all grouping logic.
    """
    # 1. Extract $match stage if present
    match_stage = {}
    if pipeline and "$match" in pipeline[0]:
        match_stage = pipeline[0]["$match"]
        pipeline = pipeline[1:]
    
    # Execute fetch with basic match filters (only eq supported natively, others fetch all)
    req = supabase_client.table(table_name).select("*")
    
    # We'll fetch all and filter in memory to support complex mongo queries ($in, $gte, etc)
    # Warning: For large tables this should be replaced with SQL GROUP BY
    try:
        res = req.execute()
        data = res.data or []
    except Exception as e:
        logger.warning(f"Supabase aggregate error on table '{table_name}': {e}")
        data = []

    # 2. Apply $match filters in python
    filtered_data = []
    for row in data:
        match = True
        for k, v in match_stage.items():
            if isinstance(v, dict):
                if "$ne" in v and row.get(k) == v["$ne"]: match = False
                if "$in" in v and row.get(k) not in v["$in"]: match = False
                if "$gte" in v and (row.get(k) is None or row.get(k) < v["$gte"]): match = False
            else:
                if row.get(k) != v: match = False
        if match:
            filtered_data.append(row)
            
    data = filtered_data

    # 3. Apply remaining pipeline stages
    for stage in pipeline:
        if "$group" in stage:
            group = stage["$group"]
            id_field = group["_id"]
            if id_field and isinstance(id_field, str) and id_field.startswith("$"):
                id_field = id_field[1:]
                
            groups = {}
            for row in data:
                key = row.get(id_field) if id_field else None
                if key not in groups:
                    groups[key] = []
                groups[key].append(row)
                
            grouped_data = []
            for k, rows in groups.items():
                res_row = {"_id": k}
                for out_field, op in group.items():
                    if out_field == "_id": continue
                    if "$sum" in op:
                        val = op["$sum"]
                        if isinstance(val, (int, float)):
                            res_row[out_field] = sum(val for _ in rows)
                        elif isinstance(val, str) and val.startswith("$"):
                            f = val[1:]
                            res_row[out_field] = sum((r.get(f) or 0) for r in rows)
                    elif "$avg" in op:
                        val = op["$avg"]
                        if isinstance(val, str) and val.startswith("$"):
                            f = val[1:]
                            valid = [r.get(f) for r in rows if r.get(f) is not None]
                            res_row[out_field] = sum(valid) / len(valid) if valid else 0
                grouped_data.append(res_row)
            data = grouped_data
            
        elif "$sort" in stage:
            sort = stage["$sort"]
            for k, d in reversed(list(sort.items())):
                data.sort(key=lambda x: x.get(k, 0) or 0, reverse=(d == -1))
                
        elif "$limit" in stage:
            data = data[:stage["$limit"]]

    if limit:
        data = data[:limit]
        
    return data
