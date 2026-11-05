# -*- coding: utf-8 -*-
"""
Dual-Tier Physical & Anti-Hallucination Validator for Taiwan Folding Bike Series Guide
Enforces ADR 20261104-folding-bike-slimming-rebuild-plan Contracts:
- Tier 1: Strict Physical Envelope & Volumetric Math Verification
- Tier 2: Business Semantic, Schema v2.0 & Taiwan Distribution Channel Contracts
Exit Code Contract:
- 0: All 110 series 100% compliant with physics, schema and ground truth anchors.
- 1: Verification failed with violation details.
"""
import sys
import os
import json

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(REPO_ROOT, "data", "series_data.json")

def validate():
    print("=================================================================")
    print("=== STARTING DUAL-TIER PHYSICAL & ANTI-HALLUCINATION AUDIT ===")
    print("=================================================================")

    target_path = sys.argv[1] if len(sys.argv) > 1 else DATA_PATH
    if not os.path.exists(target_path):
        print(f"[ERROR] Database file not found: {target_path}")
        sys.exit(1)

    with open(target_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Rule 0: Exactly 110 series with strict sequential IDs S01~S110
    if len(data) != 110:
        print(f"[FAIL] Expected exactly 110 series, got {len(data)}")
        sys.exit(1)

    expected_ids = [f"S{i:02d}" if i < 100 else f"S{i}" for i in range(1, 111)]
    actual_ids = [d.get("id") for d in data]
    if expected_ids != actual_ids:
        print(f"[FAIL] Series ID mismatch. Diff: {set(expected_ids) ^ set(actual_ids)}")
        sys.exit(1)
    print(f"[PASS] Rule 0: 110 Series sequential IDs (S01~S110) strictly verified.")

    # 8 Core Anchor Truth Targets
    ANCHOR_TRUTHS = {
        "S01": {"brand": "Brompton", "weight": (11.0, 12.5), "maxVol": 95.0, "name": "Brompton C Line"},
        "S02": {"brand": "Brompton", "weight": (8.0, 9.5), "maxVol": 95.0, "name": "Brompton T/P Line"},
        "S03": {"brand": "Pacific Cycles", "weight": (9.8, 11.5), "maxVol": 180.0, "name": "Birdy 3"},
        "S05": {"brand": "Pacific Cycles", "weight": (7.5, 9.2), "maxVol": 80.0, "name": "CarryMe"},
        "S08": {"brand": "Tyrell", "weight": (8.0, 10.0), "maxVol": 250.0, "name": "Tyrell FX/FSX"},
        "S13": {"brand": "LIDROP", "weight": (7.0, 8.5), "maxVol": 105.0, "name": "LIDROP 一丁點"},
        "S26": {"brand": "Tern", "weight": (12.0, 14.5), "maxVol": 155.0, "name": "Tern BYB"},
        "S42": {"weight": (11.5, 13.5), "name": "Merida Flyer / FB"}
    }

    v2_keys = [
        "productionStatus", "firstReleaseYear", "latestModelYear", "twDistributor",
        "twChannelAuthority", "twWarrantyCoverage", "partsFriction", "resaleRetention",
        "publicTransitFit", "buyingTraps"
    ]

    tier1_violations = []
    tier2_violations = []
    tier3_violations = []

    EBIKE_IDS = {"S27", "S55", "S63", "S84", "S86", "S100", "S107", "S108"}

    for s in data:
        sid = s.get("id")
        brand = s.get("brand", "")
        series_name = s.get("seriesName", "")
        cat = s.get("foldingCategory", "")
        camp_code = s.get("campCode", "")
        is_ebike = s.get("isEbike", False) or camp_code == "ebike" or sid in EBIKE_IDS or "電輔" in series_name or "電輔" in s.get("camp", "")
        is_fullsize = camp_code == "fullsize" or any(w in str(s.get("wheelSize", "")) for w in ["24", "26", "27.5", "700c", "559", "507"])
        weight = s.get("weightKg")
        vol = s.get("foldedVolumeL")
        fsize = s.get("foldedSizeCm")

        # -------------------------------------------------------------
        # TIER 1: Strict Physical Envelope
        # -------------------------------------------------------------
        # 1. Weight boundaries
        if is_ebike or sid in {"S27", "S100"}:
            if weight is None or not (5.0 <= weight <= 36.0):
                tier1_violations.append(f"{sid} ({brand}): E-bike weight {weight}kg outside [5.0, 36.0]kg")
        else:
            if weight is None or not (5.0 <= weight <= 22.0):
                tier1_violations.append(f"{sid} ({brand}): Regular bike weight {weight}kg outside [5.0, 22.0]kg")

        # 2. Folded volume and dimensional math formula tolerance (<= 5%)
        if cat == "nonfold" or sid == "S80":
            if vol != 0.0 or fsize != [0, 0, 0]:
                tier1_violations.append(f"{sid}: Nonfold bike must have foldedVolumeL=0.0 and foldedSizeCm=[0,0,0]")
        else:
            if not fsize or len(fsize) != 3 or any(dim <= 0 for dim in fsize):
                tier1_violations.append(f"{sid}: Invalid foldedSizeCm dimensions: {fsize}")
            else:
                calc_v = (fsize[0] * fsize[1] * fsize[2]) / 1000.0
                if vol is None or vol <= 0:
                    tier1_violations.append(f"{sid}: foldedVolumeL missing or non-positive: {vol}")
                else:
                    rel_err = abs(calc_v - vol) / vol
                    if rel_err > 0.05:
                        tier1_violations.append(f"{sid}: Volume math error {rel_err*100:.2f}% exceeds 5% (calc={calc_v:.1f}L, reported={vol:.1f}L)")

            # 3. Trifold volume tiered constraints (SWEEP-F01 resolution)
            if cat == "trifold":
                wheel_str = str(s.get("wheelSize", ""))
                is_20_inch = "20" in wheel_str or "406" in wheel_str or "451" in wheel_str or sid == "S26"
                if is_20_inch:
                    if vol > 160.0:
                        tier1_violations.append(f"{sid}: 20-inch trifold volume {vol}L exceeds 160.0L limit")
                else:
                    if vol > 120.0:
                        tier1_violations.append(f"{sid}: <=16-inch trifold volume {vol}L exceeds 120.0L limit")

            # 4. Midfold volume constraint
            if cat == "midfold":
                if is_fullsize:
                    if vol > 420.0:
                        tier1_violations.append(f"{sid}: Fullsize 24/26-inch midfold volume {vol}L exceeds 420.0L limit")
                elif is_ebike:
                    if vol > 320.0:
                        tier1_violations.append(f"{sid}: Ebike midfold volume {vol}L exceeds 320.0L limit")
                else:
                    if vol > 260.0:
                        tier1_violations.append(f"{sid}: Standard <=20-inch midfold volume {vol}L exceeds 260.0L limit")

        # 5. Core 8 Anchor Truth Constraints
        if sid in ANCHOR_TRUTHS:
            anchor = ANCHOR_TRUTHS[sid]
            if "brand" in anchor and brand != anchor["brand"]:
                tier1_violations.append(f"Anchor {sid}: Expected brand '{anchor['brand']}', got '{brand}'")
            if "weight" in anchor:
                w_min, w_max = anchor["weight"]
                if not (w_min <= weight <= w_max):
                    tier1_violations.append(f"Anchor {sid}: Weight {weight}kg outside expected [{w_min}, {w_max}]kg")
            if "maxVol" in anchor and vol > anchor["maxVol"]:
                tier1_violations.append(f"Anchor {sid}: Volume {vol}L exceeds expected anchor max {anchor['maxVol']}L")

        # -------------------------------------------------------------
        # TIER 2: Business Semantic, Schema v2.0 & Logistics Channels
        # -------------------------------------------------------------
        # 1. 9-Key Dual-Track Schema Validation (ADR 20261105)
        scores = s.get("scores", {})
        score_keys = ["weight", "volume", "rigidity", "moddability", "resale", "cp", "portability", "commute", "sport"]
        for sk in score_keys:
            val = scores.get(sk)
            if val is None or not (1.0 <= val <= 10.0):
                tier2_violations.append(f"{sid}: Invalid score {sk}={val} (must be in [1.0, 10.0])")

        # 2. Schema v2.0 Lifecycle & Logistics Fields (Test 14 contract)
        for vk in v2_keys:
            val = s.get(vk)
            if val is None or val == "":
                tier2_violations.append(f"{sid}: Missing required Schema v2.0 field: '{vk}'")

        first_y = s.get("firstReleaseYear")
        latest_y = s.get("latestModelYear")
        resale = s.get("resaleRetention")
        if not (isinstance(first_y, int) and 1970 <= first_y <= 2026):
            tier2_violations.append(f"{sid}: Invalid firstReleaseYear {first_y}")
        if not (isinstance(latest_y, int) and latest_y >= (first_y or 1970) and latest_y <= 2026):
            tier2_violations.append(f"{sid}: Invalid latestModelYear {latest_y}")
        if not (isinstance(resale, (int, float)) and 1 <= resale <= 5):
            tier2_violations.append(f"{sid}: Invalid resaleRetention {resale}")

        # 3. Aliases search verification
        aliases = s.get("aliases", [])
        if not isinstance(aliases, list) or len(aliases) == 0:
            tier2_violations.append(f"{sid}: Aliases list is empty or missing")

        # -------------------------------------------------------------
        # TIER 3: Objective Rubric Derivation & Override Governance (ADR 20261105)
        # -------------------------------------------------------------
        w = weight if weight is not None else 11.5
        expected_w = 10.0 if w <= 7.5 else (10.0 - ((w - 7.5) / 2.0) * 1.5 if w <= 9.5 else (8.5 - ((w - 9.5) / 2.5) * 2.0 if w <= 12.0 else (6.5 - ((w - 12.0) / 3.0) * 2.5 if w <= 15.0 else (4.0 - ((w - 15.0) / 5.0) * 2.5 if w <= 20.0 else max(1.0, 1.5 - ((w - 20.0) / 15.0) * 0.5)))))
        expected_w = max(1.0, min(10.0, expected_w))

        v = vol if vol is not None else 150.0
        expected_v = 1.0 if (cat == "nonfold" or sid == "S80") else (10.0 if v <= 60.0 else (10.0 - ((v - 60.0) / 30.0) * 1.0 if v <= 90.0 else (9.0 - ((v - 90.0) / 50.0) * 2.0 if v <= 140.0 else (7.0 - ((v - 140.0) / 60.0) * 2.5 if v <= 200.0 else (4.5 - ((v - 200.0) / 100.0) * 2.5 if v <= 300.0 else max(1.0, 2.0 - ((v - 300.0) / 350.0) * 1.0))))))
        expected_v = max(1.0, min(10.0, expected_v))

        # Check deviations with override governance
        for metric, actual, expected in [("weight", scores.get("weight"), expected_w), ("volume", scores.get("volume"), expected_v)]:
            if actual is not None and abs(actual - expected) > 0.35:
                reason = s.get("overrideReason")
                if not reason or len(reason.strip()) < 10:
                    tier3_violations.append(f"{sid}: {metric} score {actual} deviates from rubric {expected:.1f} without valid overrideReason (min 10 chars)")

    # Final verdict
    print("\n---------------- AUDIT RESULTS ----------------")
    print(f"Tier 1 (Physics & Math) Violations: {len(tier1_violations)}")
    for v in tier1_violations[:10]:
        print(f"  [T1-VIOLATION] {v}")
    if len(tier1_violations) > 10:
        print(f"  ... and {len(tier1_violations) - 10} more.")

    print(f"Tier 2 (Schema & Channels) Violations: {len(tier2_violations)}")
    for v in tier2_violations[:10]:
        print(f"  [T2-VIOLATION] {v}")
    if len(tier2_violations) > 10:
        print(f"  ... and {len(tier2_violations) - 10} more.")

    print(f"Tier 3 (Objective Rubric & Governance) Violations: {len(tier3_violations)}")
    for v in tier3_violations[:10]:
        print(f"  [T3-VIOLATION] {v}")
    if len(tier3_violations) > 10:
        print(f"  ... and {len(tier3_violations) - 10} more.")

    if tier1_violations or tier2_violations or tier3_violations:
        print("\n[VERDICT: FAILED] Exit code 1.")
        sys.exit(1)

    print("\n[VERDICT: 100% PASS] All 110 series strictly adhere to physics bounds, Schema v2.0 contracts, and Tier 3 Objective Rubric!")
    sys.exit(0)

if __name__ == "__main__":
    validate()
