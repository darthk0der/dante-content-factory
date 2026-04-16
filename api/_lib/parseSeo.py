import re
import json
import os

file_path = '/Users/andrellewellyn/Downloads/Dante_Labs_SEO_Content_Engine_v2.md'
out_path = '/Users/andrellewellyn/dante-content-factory/api/_lib/initial_seo_queue.json'

with open(file_path, 'r') as f:
    lines = f.readlines()

items = []
current_week = None

for line in lines:
    week_match = re.search(r'Week\s+(\d+)', line)
    if week_match:
        current_week = int(week_match.group(1))
    
    match = re.match(r'^\|\s*(\d+)\s*\|(?:\s*(\d+)\s*\|)?\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([A-Z])\s*\|\s*([0-9,]+)\s*\|', line)
    
    if match:
        id_val = int(match.group(1).strip())
        week_val = int(match.group(2).strip()) if match.group(2) and match.group(2).strip() else current_week
        url = match.group(3).strip()
        slug = url.replace('/blog/', '').replace('/', '')
        keyword = match.group(4).strip()
        variant = match.group(7).strip()
        words = int(match.group(8).replace(',', '').strip())
        
        items.append({
            'id': id_val,
            'week_number': week_val,
            'url': url,
            'slug': slug,
            'primary_keyword': keyword,
            'structure_variant': variant,
            'target_word_count': words
        })

with open(out_path, 'w') as f:
    json.dump(items, f, indent=2)

print(f"Parsed {len(items)} items.")
