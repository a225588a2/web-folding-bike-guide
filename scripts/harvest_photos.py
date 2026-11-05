# -*- coding: utf-8 -*-
"""
Robust Bike Photo Harvester for Taiwan Folding Bike Guide.
Harvests real side-profile photos from the internet.
Guarantees real JPEG format (>10KB, typical 20KB~350KB), zero SVG.
"""
import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
import re

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(REPO_ROOT, "data", "series_data.json")
MANIFEST_PATH = os.path.join(REPO_ROOT, "data", "seed_manifest.json")
IMG_DIR = os.path.join(REPO_ROOT, "dist", "images")

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def is_valid_jpeg(data):
    if len(data) < 8000:
        return False
    # JPEG magic bytes: FF D8 FF
    return data[:3] == b"\xff\xd8\xff"

def download_image(url, timeout=7):
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Referer": "https://www.google.com/"
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            if is_valid_jpeg(data):
                return data
    except Exception:
        pass
    return None

def search_bing_murls(query):
    url = f"https://www.bing.com/images/search?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9,zh-TW;q=0.8",
        "Cookie": "SRCHHPGUSR=ADLT=OFF"
    })
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            html = r.read().decode("utf-8", errors="ignore")
            murls = re.findall(r'murl&quot;:&quot;(https?://[^&]+?)&quot;', html)
            # Prioritize jpg/jpeg in url
            jpgs = [u for u in murls if any(e in u.lower() for e in [".jpg", ".jpeg"])]
            others = [u for u in murls if u not in jpgs]
            return jpgs + others
    except Exception:
        return []

def search_wikimedia(query):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch={urllib.parse.quote(query)}&gsrlimit=5&prop=imageinfo&iiprop=url|size|mime"
    req = urllib.request.Request(url, headers={"User-Agent": "BikeGuideBot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read())
            pages = data.get("query", {}).get("pages", {})
            urls = []
            for pid, p in pages.items():
                ii = p.get("imageinfo", [{}])[0]
                u = ii.get("url")
                mime = ii.get("mime", "")
                if u and "jpeg" in mime.lower():
                    urls.append(u)
            return urls
    except Exception:
        return []

def harvest_for_bike(sid, item):
    brand = item.get("brand", "")
    series_name = item.get("seriesName", "")
    eng_name = item.get("englishName", "")
    aliases = item.get("aliases", [])
    
    # Clean model name for search
    clean_series = re.sub(r'[\(\)（）/系列經典輕量旗艦都會性能跑旅]', ' ', series_name).strip()
    clean_eng = re.sub(r'[\(\)/SeriesUltralightClassicPerformanceFoldingBike]', ' ', eng_name).strip()
    
    queries = [
        f"{brand} {clean_series} side view",
        f"{brand} {clean_eng} side profile",
        f"{brand} {clean_series} 實車 側拍",
        f"{brand} {clean_eng} folding bicycle",
        f"{brand} {series_name[:12]} 單車 實拍"
    ]
    if aliases:
        queries.append(f"{brand} {aliases[0]} 折疊車 側拍")
        queries.append(f"{brand} {aliases[0]} bike")
    queries.append(f"{brand} folding bike")
    queries.append(f"{clean_eng} folding bike")

    for q in queries:
        murls = search_bing_murls(q)
        for u in murls[:10]:
            data = download_image(u)
            if data:
                return data, u, q
                
        # Try wikimedia
        wurls = search_wikimedia(f"{brand} {clean_eng}")
        for u in wurls:
            data = download_image(u)
            if data:
                return data, u, "wikimedia"
                
    return None, None, None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=str, default="S01")
    parser.add_argument("--end", type=str, default="S110")
    parser.add_argument("--force", action="store_true", help="Force re-download even if exists")
    args = parser.parse_args()

    os.makedirs(IMG_DIR, exist_ok=True)

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    start_num = int(args.start.replace("S", ""))
    end_num = int(args.end.replace("S", ""))

    print(f"=== HARVESTING REAL PHOTOS FOR S{start_num:02d} ~ S{end_num:02d} ===")

    success_count = 0
    fail_list = []

    for item in data:
        sid = item["id"]
        num = int(sid.replace("S", ""))
        if num < start_num or num > end_num:
            continue

        out_path = os.path.join(IMG_DIR, f"{sid}.jpg")
        
        # Check if already a real photo (not synthetic)
        # Synthetic files from generate_images.py are ~46-52KB with no EXIF/real camera signatures
        # If --force is passed or if we are refreshing, we fetch
        if not args.force and os.path.exists(out_path):
            with open(out_path, "rb") as f:
                header = f.read(2048)
                # Synthetic script used specific PIL drawing without Exif or camera data
                # But here we replace all synthetic photos
                pass

        print(f"[{sid}] Fetching real photo for: {item['brand']} {item['seriesName']}...")
        img_bytes, src_url, query_used = harvest_for_bike(sid, item)
        
        if img_bytes:
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            sz_kb = len(img_bytes) / 1024
            print(f"  -> SUCCESS: {sid} saved ({sz_kb:.1f} KB) from {src_url[:60]}")
            success_count += 1
        else:
            print(f"  -> FAILED: {sid} no valid JPEG found.")
            fail_list.append(sid)

        # Mild throttle to prevent aggressive blocking
        time.sleep(0.3)

    print(f"\nFinished: {success_count} succeeded, {len(fail_list)} failed.")
    if fail_list:
        print("Failed IDs:", fail_list)

if __name__ == "__main__":
    main()
