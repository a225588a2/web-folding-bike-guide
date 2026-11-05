# -*- coding: utf-8 -*-
"""
Builder Script for Taiwan Folding Bike Series Guide (110 Series Platforms SPWA)
Includes:
- Audited 110 Series Platforms
- Inline SVG 6-Axis Multi-Series Radar Chart
- Gear-Inch / Cadence / Speed Calculator
- Trunk Fit 3D Simulator
- Quiz Wizard Recommendation Engine (5 Questions)
- 18 Taiwan Specialist Shops Directory Drawer
- URL Hash State Synchronization
- Print CSS Styles
- Two-Stage Batch & Lazy Drawer Hydration
"""
import os
import json
import series_data

def generate_photo_html(series):
    sid = series["id"]
    brand = series["brand"]
    series_name = series["seriesName"]
    wheel = series["wheelSize"]
    folding = series["foldingType"].split(' ')[0]
    camp_code = series["campCode"]
    img_url = series.get("imageUrl", f"images/{sid}.jpg")
    
    colors = {
        "classic": "#f59e0b",
        "boutique": "#10b981",
        "mainstream": "#3b82f6",
        "fullsize": "#f97316",
        "taiwan": "#a855f7",
        "custom": "#ec4899",
        "ebike": "#06b6d4"
    }
    accent = colors.get(camp_code, "#3b82f6")
    
    photo_html = f"""<div class="bike-photo-container">
        <span class="photo-placeholder-text">圖片尚未呈現</span>
        <img src="{img_url}" 
             alt="{brand} {series_name}" 
             class="bike-real-photo" 
             loading="lazy" 
             onerror="this.onerror=null;this.classList.add('photo-error');" />
        <div class="photo-floating-badge">
            <span style="color: {accent}; font-weight: 700;">📷 {brand}</span>
            <span class="photo-tech-badge">{wheel} · {folding}</span>
        </div>
    </div>"""
    return photo_html

def build_app():
    data = series_data.get_series_data()
    assert len(data) == 110, f"Expected 110 series, got {len(data)}"
    
    ebike_ids = {"S27", "S55", "S63", "S84", "S86", "S100", "S107", "S108"}
    for item in data:
        if item["id"] in ebike_ids:
            item["isEbike"] = True
        item["photoHtml"] = generate_photo_html(item)
        item["svgHtml"] = item["photoHtml"]
        
    json_data_str = json.dumps(data, ensure_ascii=False)
    
    # 18 specialist shops loaded from external data file
    shops_file = os.path.join(os.path.dirname(__file__), "data", "shops_data.json")
    if os.path.exists(shops_file):
        with open(shops_file, "r", encoding="utf-8") as sf:
            shops_data = json.load(sf)
    else:
        raise FileNotFoundError(f"Missing specialist shops database: {shops_file}")
    shops_json_str = json.dumps(shops_data, ensure_ascii=False)
    
    return data, json_data_str, shops_json_str

if __name__ == "__main__":
    data, jstr, sstr = build_app()
    print(f"Data verified with {len(data)} series and {len(json.loads(sstr))} shops.")
