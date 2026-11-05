# -*- coding: utf-8 -*-
"""
Builder Script for Taiwan Folding Bike Series Guide (110 Series Platforms SPWA)
Modular Pipeline: Combines 6 frontend modules from src/ with data from build_data_helper.py.
Outputs: dist/folding_bike_series_guide_tw.html
"""
import os
import sys
import json
from build_data_helper import build_app as load_data

# Anchor CWD to repository root
REPO_ROOT = os.path.abspath(os.path.dirname(__file__))
os.chdir(REPO_ROOT)

def load_template():
    src_dir = os.path.join(REPO_ROOT, "src")
    base_tpl_path = os.path.join(src_dir, "template_base.html")
    core_css_path = os.path.join(src_dir, "styles_core.css")
    widgets_css_path = os.path.join(src_dir, "styles_widgets.css")
    core_js_path = os.path.join(src_dir, "app_core.js")
    charts_js_path = os.path.join(src_dir, "app_charts.js")
    widgets_js_path = os.path.join(src_dir, "app_widgets.js")
    
    if os.path.exists(base_tpl_path):
        with open(base_tpl_path, "r", encoding="utf-8") as f:
            html = f.read()
        with open(core_css_path, "r", encoding="utf-8") as f:
            core_css = f.read()
        with open(widgets_css_path, "r", encoding="utf-8") as f:
            widgets_css = f.read()
        with open(core_js_path, "r", encoding="utf-8") as f:
            core_js = f.read()
        with open(charts_js_path, "r", encoding="utf-8") as f:
            charts_js = f.read()
        with open(widgets_js_path, "r", encoding="utf-8") as f:
            widgets_js = f.read()
            
        html = html.replace("/* __STYLES_CORE_CSS__ */", core_css)
        html = html.replace("/* __STYLES_WIDGETS_CSS__ */", widgets_css)
        html = html.replace("/* __APP_CORE_JS__ */", core_js)
        html = html.replace("/* __APP_CHARTS_JS__ */", charts_js)
        html = html.replace("/* __APP_WIDGETS_JS__ */", widgets_js)
        return html
    elif os.path.exists("template_guide.html"):
        with open("template_guide.html", "r", encoding="utf-8") as f:
            return f.read()
    else:
        raise FileNotFoundError("Could not find modular template in src/ nor monolithic template_guide.html")

def build_html():
    print("=== BUILDING FOLDING BIKE GUIDE SPWA (110 SERIES - MODULAR) ===")
    data, json_data_str, shops_json_str = load_data()
    assert len(data) == 110, f"Expected 110 series, got {len(data)}"
    
    # Calculate camp counts
    camp_counts = {
        "__CAMP_ALL__": str(len(data)),
        "__CAMP_CLASSIC__": str(sum(1 for d in data if d["campCode"] == "classic")),
        "__CAMP_BOUTIQUE__": str(sum(1 for d in data if d["campCode"] == "boutique")),
        "__CAMP_MAINSTREAM__": str(sum(1 for d in data if d["campCode"] == "mainstream")),
        "__CAMP_FULLSIZE__": str(sum(1 for d in data if d["campCode"] == "fullsize")),
        "__CAMP_TAIWAN__": str(sum(1 for d in data if d["campCode"] == "taiwan")),
        "__CAMP_CUSTOM__": str(sum(1 for d in data if d["campCode"] == "custom")),
        "__CAMP_EBIKE__": str(sum(1 for d in data if d.get("isEbike") or d["campCode"] == "ebike")),
    }
    print("Camp counts:", camp_counts)
    
    html = load_template()
        
    # Inject data
    html = html.replace("__SERIES_DATA__", json_data_str)
    html = html.replace("__SHOPS_DATA__", shops_json_str)
    
    for placeholder, val in camp_counts.items():
        html = html.replace(placeholder, val)
        
    output_dir = "dist"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "folding_bike_series_guide_tw.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
        
    file_size_kb = os.path.getsize(output_path) / 1024
    print(f"SUCCESS: Generated {output_path} ({file_size_kb:.2f} KB)")
    return output_path

if __name__ == "__main__":
    build_html()
