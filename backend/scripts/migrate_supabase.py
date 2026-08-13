import os
import re
import glob

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already migrated or no mongodb
    if 'supabase' in content and 'mongodb' not in content:
        return

    # 1. Replace imports
    content = re.sub(r'from \.\.mongodb import .*', 'from ..supabase_client import supabase', content)
    content = re.sub(r'from \.mongodb import .*', 'from .supabase_client import supabase', content)
    content = re.sub(r'from app\.mongodb import .*', 'from app.supabase_client import supabase', content)
    
    # 2. find_one({"field": value})
    # This is naive but covers single field queries like {"id": user_id}
    def repl_find_one(m):
        collection = m.group(1).replace('_collection', '')
        query = m.group(2)
        # Parse simple single key dict: {"id": user_id} or {"email": req.email}
        q_match = re.search(r'\{\s*["\']([^"\']+)["\']\s*:\s*(.+?)\s*\}', query)
        if q_match:
            k, v = q_match.group(1), q_match.group(2)
            return f'supabase.table("{collection}").select("*").eq("{k}", {v}).execute().data[0] if supabase.table("{collection}").select("*").eq("{k}", {v}).execute().data else None'
        return m.group(0) # Unchanged if complex

    content = re.sub(r'await ([a-zA-Z0-9_]+_collection)\.find_one\((.*?)\)', repl_find_one, content)

    # 3. count_documents
    def repl_count(m):
        collection = m.group(1).replace('_collection', '')
        query = m.group(2)
        # Parse simple single key dict: {"resolved_by": user_id}
        q_match = re.search(r'\{\s*["\']([^"\']+)["\']\s*:\s*(.+?)\s*\}', query)
        if q_match:
            k, v = q_match.group(1), q_match.group(2)
            return f'supabase.table("{collection}").select("*", count="exact").eq("{k}", {v}).execute().count'
        
        # Multiple keys e.g. {"resolved_by": user_id, "status": "RESOLVED"}
        q2_match = re.search(r'\{\s*["\']([^"\']+)["\']\s*:\s*(.+?)\s*,\s*["\']([^"\']+)["\']\s*:\s*(.+?)\s*\}', query)
        if q2_match:
            k1, v1, k2, v2 = q2_match.group(1), q2_match.group(2), q2_match.group(3), q2_match.group(4)
            return f'supabase.table("{collection}").select("*", count="exact").eq("{k1}", {v1}).eq("{k2}", {v2}).execute().count'

        # Empty dict {}
        if query.strip() == '{}':
            return f'supabase.table("{collection}").select("*", count="exact").execute().count'
            
        return m.group(0)

    content = re.sub(r'await ([a-zA-Z0-9_]+_collection)\.count_documents\((.*?)\)', repl_count, content)
    
    # 4. delete_one
    def repl_delete_one(m):
        collection = m.group(1).replace('_collection', '')
        query = m.group(2)
        q_match = re.search(r'\{\s*["\']([^"\']+)["\']\s*:\s*(.+?)\s*\}', query)
        if q_match:
            k, v = q_match.group(1), q_match.group(2)
            return f'supabase.table("{collection}").delete().eq("{k}", {v}).execute()'
        return m.group(0)

    content = re.sub(r'await ([a-zA-Z0-9_]+_collection)\.delete_one\((.*?)\)', repl_delete_one, content)
    
    # 5. insert_one
    def repl_insert_one(m):
        collection = m.group(1).replace('_collection', '')
        doc = m.group(2)
        return f'supabase.table("{collection}").insert({doc}).execute()'

    content = re.sub(r'await ([a-zA-Z0-9_]+_collection)\.insert_one\((.*?)\)', repl_insert_one, content)

    # Note: update_one is too complex for regex because of $set and multiline dicts.
    # Note: find().to_list() is also complex.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    routes = glob.glob("app/routes/*.py")
    services = glob.glob("app/services/*.py")
    for f in routes + services:
        print(f"Migrating {f}")
        migrate_file(f)
