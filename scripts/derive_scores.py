# -*- coding: utf-8 -*-
"""
Objective Rubric Scoring Engine for Taiwan Folding Bike Series Guide
Implements Council Decision 20261105-bike-scoring-rubric:
- 6 Closed-form continuous rubric splines (weight, volume, rigidity, moddability, resale, cp)
- 3 Dual-track backward-compatible closed-form derivations (portability, commute, sport)
- Override governance support (scoreOverrides + overrideReason min 10 chars)
- Outputs 9-key unified scores object for all 108 series
"""
import os
import sys
import json
import math
import statistics

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(REPO_ROOT, "data", "series_data.json")

def calc_weight_score(w):
    """Spline 1: Weight score in [1.0, 10.0]"""
    if w <= 7.5:
        score = 10.0
    elif w <= 9.5:
        score = 10.0 - ((w - 7.5) / 2.0) * 1.5
    elif w <= 12.0:
        score = 8.5 - ((w - 9.5) / 2.5) * 2.0
    elif w <= 15.0:
        score = 6.5 - ((w - 12.0) / 3.0) * 2.5
    elif w <= 20.0:
        score = 4.0 - ((w - 15.0) / 5.0) * 2.5
    else:
        score = max(1.0, 1.5 - ((w - 20.0) / 15.0) * 0.5)
    return max(1.0, min(10.0, score))

def calc_volume_score(cat, vol, sid=None):
    """Spline 2: Volume score in [1.0, 10.0] with <=60L saturation"""
    if cat == "nonfold":
        return 1.0
    if vol <= 60.0:
        score = 10.0
    elif vol <= 90.0:
        score = 10.0 - ((vol - 60.0) / 30.0) * 1.0
    elif vol <= 140.0:
        score = 9.0 - ((vol - 90.0) / 50.0) * 2.0
    elif vol <= 200.0:
        score = 7.0 - ((vol - 140.0) / 60.0) * 2.5
    elif vol <= 300.0:
        score = 4.5 - ((vol - 200.0) / 100.0) * 2.5
    else:
        score = max(1.0, 2.0 - ((vol - 300.0) / 350.0) * 1.0)
    return max(1.0, min(10.0, score))

def calc_rigidity_score(cat, wheelbase, wheel_cat, wheel_str):
    """Spline 3: Rigidity score in [1.0, 10.0] based on canonical folding mechanism & geometry"""
    base_scores = {
        "nonfold": 9.5,
        "vertical": 8.5,
        "coaxial": 7.8,
        "trifold": 7.5,
        "midfold": 6.5,
        "slide_special": 5.0
    }
    base = base_scores.get(cat, 6.5)

    delta_wb = 0.0
    if wheelbase >= 1030:
        delta_wb = +0.5
    elif wheelbase < 960:
        delta_wb = -0.5

    delta_ws = 0.0
    # Determine wheel size
    is_large = wheel_cat in ("20", "24", "24+", "26") or any(w in str(wheel_str) for w in ["20\"", "24\"", "26\"", "27.5\"", "700c", "700C", "622", "559", "507", "451", "406"])
    is_small = wheel_cat in ("8-14", "16") or any(w in str(wheel_str) for w in ["6\"", "8\"", "12\"", "14\"", "16\"", "305", "349"])
    if is_large and not (is_small and "16" in str(wheel_str) and not "20" in str(wheel_str)):
        delta_ws = +0.5
    elif is_small and not ("20" in str(wheel_str)):
        delta_ws = -0.5

    score = base + delta_wb + delta_ws
    return max(1.0, min(10.0, score))

def calc_moddability_score(ucs):
    """Spline 4: Moddability score in [1.0, 10.0] derived from UCS stars"""
    return max(1.0, min(10.0, float(ucs) * 2.0))

def calc_resale_score(retention):
    """Spline 5: Resale retention score in [1.0, 10.0]"""
    return max(1.0, min(10.0, (float(retention) - 1.0) * 2.0 + 2.0))

def calc_cp_score(w, v, r, m, price):
    """Spline 6: Cost-performance score in [1.0, 10.0] using spec-price logarithmic ratio"""
    spec_index = 0.25 * w + 0.25 * v + 0.25 * r + 0.25 * m
    eff_price = max(5000.0, float(price))
    p_index = max(1.0, min(10.0, 10.0 - (math.log10(eff_price) - 3.8) * 6.0))
    cp_score = max(1.0, min(10.0, 0.40 * spec_index + 0.60 * p_index))
    return cp_score

def derive_scores(series_list):
    """Derive 9 scores for all series items."""
    for s in series_list:
        sid = s["id"]
        w_val = s.get("weightKg", 11.5)
        v_val = s.get("foldedVolumeL", 150.0)
        cat = s.get("foldingCategory", "midfold")
        wb = s.get("wheelbaseMm", 1000)
        wc = s.get("wheelSizeCat", "20")
        ws = s.get("wheelSize", "20\"")
        ucs = s.get("ucsScore", 3.0)
        ret = s.get("resaleRetention", 3)
        price = s.get("medianPrice", 25000)

        # 6 Raw spline scores
        w_score = round(calc_weight_score(w_val), 1)
        v_score = round(calc_volume_score(cat, v_val, sid), 1)
        r_score = round(calc_rigidity_score(cat, wb, wc, ws), 1)
        m_score = round(calc_moddability_score(ucs), 1)
        ret_score = round(calc_resale_score(ret), 1)
        cp_score = round(calc_cp_score(w_score, v_score, r_score, m_score, price), 1)

        # 3 Closed-form compatibility dual-track scores
        port_score = round(0.45 * w_score + 0.55 * v_score, 1)
        comm_score = round(0.25 * w_score + 0.35 * v_score + 0.20 * r_score + 0.20 * m_score, 1)
        sport_score = round(0.45 * r_score + 0.25 * w_score + 0.30 * m_score, 1)

        scores_obj = {
            "weight": w_score,
            "volume": v_score,
            "rigidity": r_score,
            "moddability": m_score,
            "resale": ret_score,
            "cp": cp_score,
            "portability": port_score,
            "commute": comm_score,
            "sport": sport_score
        }

        # Handle explicit scoreOverrides if governance applies
        overrides = s.get("scoreOverrides", {})
        if overrides:
            reason = s.get("overrideReason", "")
            if len(reason.strip()) >= 10:
                for k, v in overrides.items():
                    if k in scores_obj:
                        scores_obj[k] = round(float(v), 1)
                print(f"[OVERRIDE] {sid}: Applied overrides {overrides} (Reason: {reason[:20]}...)")
            else:
                print(f"[OVERRIDE WARNING] {sid}: scoreOverrides ignored due to invalid overrideReason: '{reason}'")

        # Clamp all scores strictly to [1.0, 10.0]
        for k in scores_obj:
            scores_obj[k] = max(1.0, min(10.0, scores_obj[k]))

        s["scores"] = scores_obj

    return series_list

def main():
    target_path = sys.argv[1] if len(sys.argv) > 1 else DATA_PATH
    print(f"=== RUNNING OBJECTIVE RUBRIC SCORING ENGINE ON {target_path} ===")
    with open(target_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated_data = derive_scores(data)

    # Compute statistics across all 108 series
    keys = ["weight", "volume", "rigidity", "moddability", "resale", "cp", "portability", "commute", "sport"]
    stats = {}
    for k in keys:
        vals = [d["scores"][k] for d in updated_data]
        stats[k] = {
            "mean": statistics.mean(vals),
            "stdev": statistics.stdev(vals),
            "min": min(vals),
            "max": max(vals)
        }

    print("\n---------------- NEW SCORE DISTRIBUTIONS ----------------")
    for k in keys:
        st = stats[k]
        print(f"  {k:12s}: Mean={st['mean']:.2f}, StDev={st['stdev']:.2f}, Min={st['min']:.1f}, Max={st['max']:.1f}")

    # Write back
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(updated_data, f, ensure_ascii=False, indent=2)

    print(f"\n[SUCCESS] Successfully derived 9-key scores for all {len(updated_data)} series in {target_path}.")

if __name__ == "__main__":
    main()
