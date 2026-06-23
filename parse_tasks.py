import json

with open("/home/boba/.gemini/antigravity/brain/17d275fb-ecd3-4bde-9380-73843e354bb6/.system_generated/steps/17/output.txt") as f:
    data = json.load(f)

for task in data.get("content", []):
    key = task.get("idTaskProject")
    title = task.get("title")
    column = task.get("columnId")
    if key and "24" in key:
        print(f"Key: {key}, Title: {title}, Column: {column}")
    elif title and "24" in title:
        print(f"Key: {key}, Title: {title}, Column: {column}")
    elif "TES" in str(key):
        print(f"Key: {key}, Title: {title}, Column: {column}")
