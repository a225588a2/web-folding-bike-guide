# 台灣市場折疊自行車全景指南 — 接手端 Agent 自律線上重建計畫書 (Rebuild Blueprint)

> **版本協定**：ADR 20261104-folding-bike-slimming-rebuild-plan (Proposal v4 定案)  
> **目標倉庫**：`git@github.com:a225588a2/web-folding-bike-guide.git`  
> **作業模式**：具備連網搜尋能力之遠端 Agent 自律採集與重建（無壓縮生資料，純代碼架構 + 種子清單 + 物理防幻覺校驗閉環）

---

## 1. 執行目標與環境隔離原則

你是接手本專案的資深工程師 Agent。本專案已完成代碼與模組瘦身，移除了本地壓縮打包海量生資料的舊機制。
你需要：
1. 在目標倉庫建立隔離分支 `chore/remote-rebuild-v1` 進行作業。
2. 根據種子清單 `data/seed_manifest.json`（110 車系別名與錨點）與 48 欄位嚴格 Schema，利用你的連網搜尋能力自律補齊規格，生成 `data/series_data.json`。
3. 連網搜尋下載 110 款車系代表性實車照片儲存至 `dist/images/S01.jpg` ~ `S110.jpg`（單張 > 5KB）。
4. 嚴禁任何 SVG 占位圖生成代碼；在圖片下載完成前，前端純 CSS 容器自適應提示「圖片尚未呈現」，確保 CLS=0。
5. 執行雙階物理防幻覺校驗 `python scripts/validate_data.py`，必須 `Exit Code = 0`。
6. 執行組裝 `python build_html.py` 與 30 項端到端驗收測試 `node verify_full_suite.js`，達成 100% PASS。

---

## 2. 步驟一：工作區初始化與微批次代碼落地

在遠端目標倉庫執行：
```bash
git checkout -b chore/remote-rebuild-v1
```
依序貼入剪貼簿微批次（Batch 1A ~ Batch 4），建立以下核心模組結構：
- `src/template_base.html` (語意化骨架)
- `src/styles_core.css` (版面與 CSS 幾何鎖定 `aspect-ratio: 16/9; contain: paint layout size;`)
- `src/styles_widgets.css` (組件專屬樣式)
- `src/app_core.js` (資料過濾、搜尋引擎與釘選比對)
- `src/app_charts.js` (SVG 6 軸雷達與 Canvas 散布圖)
- `src/app_widgets.js` (齒比/後車廂/問卷推薦/專門店目錄)
- `data/shops_data.json` (18 間全台專門店資料)
- `data/seed_manifest.json` (110 車系別名與錨點清單)
- `build_html.py` & `build_data_helper.py` (組裝流水線)
- `scripts/validate_data.py` (雙階物理防幻覺校驗器)
- `verify_full_suite.js` (30 項端到端自動化驗收測試)

---

## 3. 步驟二：自律連網採集與 48 欄位 Schema 重建

讀取 `data/seed_manifest.json`，對 110 款車系進行連網檢索，生成 `data/series_data.json`。

### 3.1 48 欄位資料模型 Schema 契約
每筆車系必須包含完整 48 欄位（對齊 `verify_full_suite.js` Test 14 與前端渲染）：
```json
{
  "id": "S01",                          // [S01 ~ S110] 嚴格順序字串
  "brand": "Brompton",                  // 品牌
  "seriesName": "C Line / A Line 經典鋼管三折系列", // 中文車系全名
  "englishName": "Brompton C Line / A Line Classic Steel Trifold", // 英文全名
  "camp": "經典英系",                   // 陣營名稱
  "campCode": "classic",                // classic, boutique, mainstream, fullsize, taiwan, custom, ebike
  "priceRange": [48000, 78000],         // [最低價, 最高價] 台幣
  "medianPrice": 63000,                 // 價格中位數
  "tcoEstimate": 68000,                 // 擁車成本估算
  "weightKg": 11.8,                     // 整備重量 (kg) [5.0 ~ 22.0, 電輔長尾 <= 36.0]
  "weightRange": [11.2, 12.5],          // 重量範圍 [min, max]
  "wheelSize": "16\" (349)",            // 輪徑規格字串
  "wheelSizeCat": "16",                 // 輪徑分類
  "tireClearance": "16x1-3/8 (35-349)", // 輪胎間隙相容
  "wheelbaseMm": 1045,                  // 軸距 (mm)
  "unfoldedSizeCm": [148, 56, 106],     // 展開幾何 [長, 寬, 高] cm
  "foldedSizeCm": [58.5, 56.5, 27],     // 收折幾何 [長, 寬, 高] cm
  "foldedVolumeL": 89.2,                // 折疊體積 (L) = (L*W*H)/1000 容差 <= 5%
  "transportRating": 5,                 // 大眾運輸攜帶性評分 (1~5)
  "foldingType": "三折 (Trifold)",      // 折疊方式描述
  "foldSeconds": 15,                    // 折疊耗時 (秒)
  "ucsScore": 4.5,                      // 通用改裝度評分 (1.0~5.0)
  "ucsRatingText": "專規與通用並存",    // 改裝評級文字
  "specs": {                            // 核心技術規格字典
    "frameMaterial": "4130 鉻鉬鋼",
    "transmission": "Sturmey-Archer 內變 + 外變",
    "brakes": "雙軸輪圈C夾",
    "foldJoint": "主梁鉸鏈 + 後三角旋折"
  },
  "scores": {                           // 5 軸評分 (1.0 ~ 10.0)
    "sport": 6.2,
    "commute": 9.8,
    "portability": 9.8,
    "rigidity": 7.5,
    "moddability": 8.5
  },
  "keyFeatures": ["經典英倫風格", "專利前包插扣系統", "平整推行輪設計"],
  "subModels": ["C Line Explore", "C Line Urban", "A Line"],
  "twChannel": "輪粹單車總代理直營與認證經銷體系",
  "officialUrl": "https://www.brompton.com",
  "svgType": "trifold",
  "productionStatus": "ACTIVE_IN_PRODUCTION", // [ACTIVE_IN_PRODUCTION, ACTIVE_IN_STOCK, DISCONTINUED_CLASSIC, COLLECTIBLE_VINTAGE, DORMANT_DEFUNCT]
  "firstReleaseYear": 1975,             // 首次發表年份 (1970~2026)
  "latestModelYear": 2026,              // 最新年式 (>= firstReleaseYear)
  "twDistributor": "輪粹單車 (LaneTrip)", // 台灣總代理/通路
  "twChannelAuthority": "總代理公司貨", // [總代理公司貨, 原廠授權經銷, 專門小徑工作室, 平行輸入水貨, 純二手交流]
  "twWarrantyCoverage": "原廠車架 7 年保固",
  "partsFriction": "耗材原廠與副廠充裕",
  "resaleRetention": 5,                 // 二手保值評分 (1~5)
  "publicTransitFit": "北捷/高鐵/台鐵/市區公車免攜車袋推行友善",
  "buyingTraps": "注意大梁鉸鏈銅襯套磨損、後避震優力膠老化、座管襯套滑牙",
  "foldingCategory": "trifold",         // [trifold, vertical, midfold, coaxial, slide_special, nonfold]
  "aliases": ["小布", "布車", "Brompton", "Brompton C Line", "A Line", "輪粹"],
  "imageUrl": "images/S01.jpg"
}
```

### 3.2 8 大關鍵驗收錨點真值表（防幻覺校準基準）
遠端採集時，以下 8 款車之客觀物理參數必須精確符合：
1. **S01 (Brompton C Line)**: 品牌 `Brompton`, 車重 `11.8kg` (約束 11.0~12.5), 體積 `89.2L` (<= 95L)
2. **S02 (Brompton T/P Line)**: 品牌 `Brompton`, 車重 `8.8kg` (約束 8.0~9.5), 體積 `89.2L` (<= 95L)
3. **S03 (Pacific Cycles Birdy 3)**: 品牌 `Pacific Cycles`, 車重 `10.6kg` (約束 9.8~11.5), 體積 `168.5L` (<= 180L)
4. **S05 (Pacific Cycles CarryMe)**: 品牌 `Pacific Cycles`, 車重 `8.4kg` (約束 7.5~9.2), 體積 `72.8L` (<= 80L)
5. **S08 (Tyrell FX / FSX)**: 品牌 `Tyrell`, 車重 `8.9kg` (約束 8.0~10.0), 體積 `240.5L` (<= 250L)
6. **S13 (LIDROP 一丁點)**: 品牌 `LIDROP`, 車重 `7.6kg` (約束 7.0~8.5), 體積 `94.9L` (<= 105L)
7. **S26 (Tern BYB)**: 品牌 `Tern`, 車重 `13.2kg` (約束 12.0~14.5), 體積 `147.4L` (<= 155L)
8. **S42 (Merida 飛翔 / Flyer)**: 品牌 `Merida`, 車重 `12.6kg` (約束 11.5~13.5)

---

## 4. 步驟三：實車照片抓取協定 (Zero-SVG 規範)

1. 在 `dist/images/` 目錄下載 110 款車的代表性實車照片，檔名為 `S01.jpg` ~ `S110.jpg`。
2. 每張圖片檔案大小必須 `> 5,000 bytes`（對齊 Test 25 斷言）。
3. **前端占位契約**：在未抓取或抓取中，前端 `<img>` 觸發 `onerror` 加上 `.photo-error` 隱藏，容器自然露出純文字「圖片尚未呈現」，嚴禁生成任何 SVG 占位圖代碼。

---

## 5. 步驟四：雙階物理防幻覺校驗 (Exit Code = 0)

執行校驗器：
```bash
python scripts/validate_data.py
```
- **Tier 1 物理約束**：
  * 車重：一般折疊車 5.0~22.0 kg；電輔/長尾載貨車 5.0~36.0 kg。
  * 折疊體積幾何公式：`L * W * H / 1000` 與 `foldedVolumeL` 誤差 <= 5%（S80 nonfold 為 0.0）。
  * 三折車分級：20 吋大輪徑 (S26) <= 160.0 L，16 吋及以下 <= 120.0 L。
  * 橫折車：標準 20 吋及以下 <= 260.0 L；大折 24~26 吋 <= 420.0 L。
- **Tier 2 語意與通路約束**：
  * 5 軸 scores 皆在 [1.0, 10.0]。
  * Test 14 要求的 10 大生命週期與通路欄位非空且符合型別。
  * Test 3 要求的中文俗稱別名齊備。
**退出狀態碼必須為 0** 方可進行下一步。

---

## 6. 步驟五：SPWA 組裝與 30 項全自動驗收測試

1. **執行單頁組裝**：
   ```bash
   python build_html.py
   ```
   產出 `dist/folding_bike_series_guide_tw.html`。
2. **執行 30 項自動化測試套件**：
   ```bash
   node verify_full_suite.js
   ```
   **驗收成功條件**：看到 `=== ALL 30 DEEP VERIFICATION TESTS PASSED WITH 100% SUCCESS! ===`。

---

## 7. 步驟六：交付與回滾銷毀防線

- 若 30 項測試全數通過：
   ```bash
   git add dist/ data/ scripts/ src/ build_html.py build_data_helper.py
   git commit -m "chore(rebuild): successfully rebuilt 110 series guide with online data and real photos"
   git push origin chore/remote-rebuild-v1
   ```
- 若測試未通過且無法自律修復，執行原子回滾銷毀：
   ```bash
   git checkout -f main && git branch -D chore/remote-rebuild-v1
   ```
