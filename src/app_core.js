    // State Variables
    let currentFilter = {
        camp: 'all',
        wheel: 'all',
        folding: 'all',
        lifecycle: 'all',
        channel: 'all',
        maxPrice: 250000,
        minUcs: 0,
        orientation: 'all',
        search: '',
        sortBy: 'id_asc'
    };

    let pinnedIds = [];
    let currentLadderCategory = 'weight';
    let showAllLadder = false;
    let canvasPoints = [];
    let hoveredPoint = null;
    let currentShopRegion = 'all';

    // Batch Rendering State for Lazy Hydration
    let renderedCount = 0;
    const BATCH_SIZE = 18;
    let currentFilteredList = [];

    // Initialize Application
    document.addEventListener("DOMContentLoaded", () => {
        initPopulateSelectors();
        renderSeriesGrid();
        renderLadder();
        initCanvas();
        initQuizModal();
        initShopDrawer();
        setupIntersectionObserver();
        restoreStateFromHash();
    });

    // Populate selectors for calculators
    function initPopulateSelectors() {
        const bSel = document.getElementById("trunkBikeSelect");
        if (bSel) {
            bSel.innerHTML = SERIES_DATA.map(b => `<option value="${b.id}">${b.id} ${b.brand} ${b.seriesName} (${b.foldedSizeCm[0]}x${b.foldedSizeCm[1]}x${b.foldedSizeCm[2]}cm)</option>`).join("");
        }
    }

    // State URL Hashing & History Navigation
    function syncStateToHash() {
        const parts = [];
        if (pinnedIds.length > 0) parts.push(`compare=${pinnedIds.join(',')}`);
        if (currentFilter.camp !== 'all') parts.push(`camp=${currentFilter.camp}`);
        if (currentFilter.search) parts.push(`search=${encodeURIComponent(currentFilter.search)}`);
        if (currentFilter.sortBy !== 'id_asc') parts.push(`sort=${currentFilter.sortBy}`);
        if (currentFilter.wheel !== 'all') parts.push(`wheel=${currentFilter.wheel}`);
        if (currentFilter.folding !== 'all') parts.push(`folding=${currentFilter.folding}`);
        if (currentFilter.lifecycle !== 'all') parts.push(`lifecycle=${currentFilter.lifecycle}`);
        if (currentFilter.channel !== 'all') parts.push(`channel=${encodeURIComponent(currentFilter.channel)}`);
        if (currentFilter.maxPrice < 250000) parts.push(`priceMax=${currentFilter.maxPrice}`);
        if (currentFilter.minUcs > 0) parts.push(`ucs=${currentFilter.minUcs}`);
        if (currentFilter.orientation !== 'all') parts.push(`orientation=${currentFilter.orientation}`);
        const newHash = parts.length > 0 ? '#' + parts.join('&') : '';
        if (window.location.hash !== newHash) {
            try {
                history.replaceState(null, '', newHash || window.location.pathname);
            } catch (e) {}
        }
    }

    function restoreStateFromHash() {
        if (!window.location.hash) return;
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        if (params.has('compare')) {
            const ids = params.get('compare').split(',');
            pinnedIds = ids.filter(id => SERIES_DATA.some(x => x.id === id)).slice(0, 4);
            updatePinDock();
            if (pinnedIds.length >= 2) openCompareModal();
        }
        if (params.has('search')) {
            const q = params.get('search');
            const el = document.getElementById("searchInput");
            if (el) el.value = q;
            currentFilter.search = q;
        }
        if (params.has('sort')) {
            const s = params.get('sort');
            const el = document.getElementById("sortSelect");
            if (el) el.value = s;
            currentFilter.sortBy = s;
        }
        if (params.has('wheel')) {
            const w = params.get('wheel');
            const el = document.getElementById("wheelFilter");
            if (el) el.value = w;
            currentFilter.wheel = w;
        }
        if (params.has('folding')) {
            const f = params.get('folding');
            const el = document.getElementById("foldingFilter");
            if (el) el.value = f;
            currentFilter.folding = f;
        }
        if (params.has('lifecycle')) {
            const l = params.get('lifecycle');
            const el = document.getElementById("lifecycleFilter");
            if (el) el.value = l;
            currentFilter.lifecycle = l;
        }
        if (params.has('channel')) {
            const c = params.get('channel');
            const el = document.getElementById("channelFilter");
            if (el) el.value = c;
            currentFilter.channel = c;
        }
        if (params.has('priceMax')) {
            const p = parseInt(params.get('priceMax'), 10);
            if (!isNaN(p)) {
                const el = document.getElementById("priceMaxSlider");
                if (el) el.value = p;
                currentFilter.maxPrice = p;
                updatePriceSlider(p);
            }
        }
        if (params.has('ucs')) {
            const u = parseFloat(params.get('ucs'));
            if (!isNaN(u)) {
                const el = document.getElementById("ucsFilter");
                if (el) el.value = u;
                currentFilter.minUcs = u;
            }
        }
        if (params.has('orientation')) {
            const o = params.get('orientation');
            const el = document.getElementById("orientationFilter");
            if (el) el.value = o;
            currentFilter.orientation = o;
        }
        if (params.has('camp')) {
            filterByCamp(params.get('camp'));
        } else {
            applyFilters();
        }
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('hashchange', restoreStateFromHash);
        window.addEventListener('beforeprint', () => {
            if (renderedCount < currentFilteredList.length) {
                renderedCount = currentFilteredList.length;
                const grid = document.getElementById("seriesGrid");
                if (grid) {
                    grid.innerHTML = currentFilteredList.map(item => renderCardHtml(item)).join("");
                }
            }
        });
    }

    function copyCompareShareLink() {
        syncStateToHash();
        const url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => showToast("✓ 已複製比對分享連結至剪貼簿！"));
        } else {
            showToast("✓ 比對網址已更新，可直接複製瀏覽器網址列！");
        }
    }

    // Toast Helper
    function showToast(msg) {
        const el = document.getElementById("appToast");
        el.innerText = msg;
        el.classList.add("show");
        setTimeout(() => {
            el.classList.remove("show");
        }, 3200);
    }

    // Two-Stage Batch Rendering Engine
    function setupIntersectionObserver() {
        const sentinel = document.getElementById("seriesGridSentinel");
        if (!sentinel) return;
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    appendNextBatch();
                }
            }, { rootMargin: '400px' });
            observer.observe(sentinel);
        } else {
            window.addEventListener('scroll', () => {
                if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                    appendNextBatch();
                }
            });
        }
    }

    function renderSeriesGrid() {
        currentFilteredList = getFilteredData();
        const grid = document.getElementById("seriesGrid");
        const countEl = document.getElementById("filteredCount");
        if (countEl) countEl.innerText = currentFilteredList.length;

        if (currentFilteredList.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: 12px; border: 1px dashed var(--border-color);">
                    <div style="font-size: 36px; margin-bottom: 10px;">🔍</div>
                    <h3 style="color: #fff; margin-bottom: 6px;">查無符合條件的折疊車系</h3>
                    <p style="font-size: 13px;">請嘗試放寬篩選條件、重置價格滑桿或切換至「全部陣營」。</p>
                    <button class="reset-btn" style="margin-top: 14px;" onclick="resetAllFilters()">重置所有條件</button>
                </div>
            `;
            renderedCount = 0;
            return;
        }

        // Render first batch
        renderedCount = Math.min(BATCH_SIZE, currentFilteredList.length);
        grid.innerHTML = currentFilteredList.slice(0, renderedCount).map(item => renderCardHtml(item)).join("");
    }

    function appendNextBatch() {
        if (renderedCount >= currentFilteredList.length) return;
        const grid = document.getElementById("seriesGrid");
        const nextBatch = currentFilteredList.slice(renderedCount, renderedCount + BATCH_SIZE);
        const temp = document.createElement("div");
        temp.innerHTML = nextBatch.map(item => renderCardHtml(item)).join("");
        while (temp.firstChild) {
            grid.appendChild(temp.firstChild);
        }
        renderedCount += nextBatch.length;
    }

    // Card HTML Renderer
    function renderCardHtml(item) {
        const isPinned = pinnedIds.includes(item.id);
        const pinClass = isPinned ? 'card-pin-btn pinned' : 'card-pin-btn';
        const pinText = isPinned ? '✓ 已釘選' : '📌 釘選';

        const campColors = {
            classic: 'var(--accent-classic)',
            boutique: 'var(--accent-boutique)',
            mainstream: 'var(--accent-mainstream)',
            fullsize: 'var(--accent-fullsize)',
            taiwan: 'var(--accent-taiwan)',
            custom: 'var(--accent-custom)',
            ebike: 'var(--accent-ebike)'
        };
        const badgeColor = campColors[item.campCode] || '#3b82f6';

        const unfoldedVol = ((item.unfoldedSizeCm[0] * item.unfoldedSizeCm[1] * item.unfoldedSizeCm[2]) / 1000).toFixed(0);
        let reductionPct = (((1 - item.foldedVolumeL / (unfoldedVol || 1))) * 100).toFixed(0);
        let compressRatio = ((item.foldedVolumeL / (unfoldedVol || 1)) * 100).toFixed(1);
        if (item.foldingCategory === 'nonfold') {
            reductionPct = "0";
            compressRatio = "100.0";
        }

        let wbDesc = "都會標準軸距";
        if (item.wheelbaseMm < 950) wbDesc = "超靈活短軸距";
        else if (item.wheelbaseMm > 1030) wbDesc = "公路穩定長軸距";

        let wtDesc = "都會通用級";
        if (item.weightKg < 8.0) wtDesc = "🪶極限羽量";
        else if (item.weightKg <= 10.5) wtDesc = "⚡輕量跑格";
        else if (item.weightKg > 12.5) wtDesc = "🛡️重載巡航";

        const unitCost = Math.round(item.medianPrice / item.weightKg).toLocaleString();

        const statusMap = {
            ACTIVE_IN_PRODUCTION: { label: '🟢 現役量產', class: 'status-active' },
            ACTIVE_IN_STOCK: { label: '🟡 庫存在售', class: 'status-stock' },
            DISCONTINUED_CLASSIC: { label: '🟠 停產名駒', class: 'status-discontinued' },
            COLLECTIBLE_VINTAGE: { label: '🟣 典藏逸品', class: 'status-collector' },
            COLLECTORS_EDITION: { label: '🟣 典藏逸品', class: 'status-collector' },
            DORMANT_DEFUNCT: { label: '⚪ 品牌休眠', class: 'status-dormant' },
            BRAND_DORMANT: { label: '⚪ 品牌休眠', class: 'status-dormant' }
        };
        const stObj = statusMap[item.productionStatus] || { label: item.productionStatus, class: 'status-active' };
        const statusBadgeHtml = `<span class="status-badge ${stObj.class}">${stObj.label}</span><span class="year-badge">(${item.firstReleaseYear}~${item.latestModelYear})</span>`;
        const stars = '★'.repeat(item.resaleRetention || 3) + '☆'.repeat(5 - (item.resaleRetention || 3));

        return `
        <article class="series-card" id="card-${item.id}">
            <div class="card-top">
                <div class="card-brand-title">
                    <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
                        <span class="card-id-badge">${item.id}</span>
                        <span style="font-size: 11px; font-weight: 700; color: ${badgeColor};">● ${item.camp}</span>
                        ${statusBadgeHtml}
                    </div>
                    <h3>${item.brand} ${item.seriesName}</h3>
                    <div class="en-title">${item.englishName}</div>
                </div>
                <button class="${pinClass}" id="pin-btn-${item.id}" onclick="togglePin('${item.id}')">
                    ${pinText}
                </button>
            </div>

            <div class="card-visual">
                ${item.photoHtml || item.svgHtml}
            </div>

            <div class="card-body">
                <div class="metrics-grid">
                    <div class="metric-cell">
                        <div class="meta-lbl">💰 價格與成本分析</div>
                        <div class="meta-val">NT$ ${item.priceRange[0].toLocaleString()} ~ ${item.priceRange[1].toLocaleString()}</div>
                        <div class="sub-val">中位: $${item.medianPrice.toLocaleString()} ｜ 單位成本: $${unitCost}/kg</div>
                    </div>

                    <div class="metric-cell">
                        <div class="meta-lbl">⚖️ 重量與級距分析</div>
                        <div class="meta-val">${item.weightKg} kg</div>
                        <div class="sub-val">整備帶: ${item.weightRange[0]}~${item.weightRange[1]} kg ｜ ${wtDesc}</div>
                    </div>

                    <div class="metric-cell">
                        <div class="meta-lbl">📐 摺疊前後尺寸分析</div>
                        <div class="meta-val" style="font-size: 12.5px;">
                            展開: ${item.unfoldedSizeCm[0]}×${item.unfoldedSizeCm[1]}×${item.unfoldedSizeCm[2]} cm (${unfoldedVol}L)
                        </div>
                        <div class="sub-val" style="color:#e2e8f0; margin-top:2px;">
                            收折: <strong style="color:#38bdf8;">${item.foldedSizeCm[0]}×${item.foldedSizeCm[1]}×${item.foldedSizeCm[2]} cm (${item.foldedVolumeL}L)</strong>
                        </div>
                        <div class="sub-val" style="color:#34d399; font-weight:700;">
                            體積縮減率: ${reductionPct}% (壓縮至 ${compressRatio}%)
                        </div>
                    </div>

                    <div class="metric-cell">
                        <div class="meta-lbl">🚴 輪距與輪胎相容性</div>
                        <div class="meta-val">${item.wheelSize}</div>
                        <div class="sub-val">軸距: <strong>${item.wheelbaseMm}mm</strong> (${wbDesc})</div>
                        <div class="sub-val">胎寬上限: ${item.tireClearance}</div>
                    </div>
                </div>

                <!-- Folding Type & Transit Tag -->
                <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px 10px; border-radius: var(--radius-sm); font-size: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <div>
                        <span style="color: var(--text-muted);">折疊型態:</span>
                        <strong style="color: #fff;">${item.foldingType} (${item.foldSeconds}s)</strong>
                    </div>
                    <div style="color: #38bdf8; font-weight: 600; font-size: 11px;">
                        ${item.transportRating}
                    </div>
                </div>

                <!-- Schema v2.0 Logistics & Support Matrix -->
                <div class="v2-logistics-grid">
                    <div class="logistics-cell">
                        <span class="logistics-lbl">🛡️ 代理通路授權</span>
                        <span class="logistics-val" style="color:#38bdf8;">${item.twChannelAuthority}</span>
                        <span class="logistics-sub" title="${item.twDistributor}">${item.twDistributor}</span>
                    </div>
                    <div class="logistics-cell">
                        <span class="logistics-lbl">🔧 耗材取得摩擦度</span>
                        <span class="logistics-val" style="color:#34d399;">${item.partsFriction}</span>
                    </div>
                    <div class="logistics-cell">
                        <span class="logistics-lbl">🚆 大眾運輸友善度</span>
                        <span class="logistics-val" style="color:#facc15;">${item.publicTransitFit}</span>
                    </div>
                    <div class="logistics-cell">
                        <span class="logistics-lbl">⭐ 二手市場保值</span>
                        <span class="logistics-val" style="color:#fb923c;">${stars}</span>
                    </div>
                </div>

                <!-- Key Features -->
                <ul class="card-features">
                    ${item.keyFeatures.map(f => `<li>${f}</li>`).join("")}
                </ul>

                <!-- Sub-models & Lazy Drawer Toggle -->
                <button class="card-drawer-toggle" onclick="toggleDrawer('${item.id}')">
                    <span>展開代表子型號 (${item.subModels.length} 款) ＆ 售後避坑指南</span>
                    <span id="drawer-arrow-${item.id}">▼</span>
                </button>

                <!-- Lazy Hydrated Drawer -->
                <div class="card-drawer" id="drawer-${item.id}" data-hydrated="false"></div>
            </div>

            <div class="card-footer">
                <div>
                    <span style="color: var(--text-muted);">通路:</span>
                    <span style="color: #cbd5e1;">${item.twChannel}</span>
                </div>
                <a href="${item.officialUrl}" target="_blank" rel="noopener noreferrer" class="official-link-btn">
                    官方/代理連結 ↗
                </a>
            </div>
        </article>
        `;
    }

    // Lazy Hydrate Card Drawer
    function toggleDrawer(id) {
        const drawer = document.getElementById("drawer-" + id);
        const arrow = document.getElementById("drawer-arrow-" + id);
        if (!drawer) return;

        if (drawer.style.display === "block") {
            drawer.style.display = "none";
            if (arrow) arrow.innerText = "▼";
            return;
        }

        // Check if hydrated
        if (drawer.getAttribute("data-hydrated") !== "true") {
            hydrateDrawer(id);
        }

        drawer.style.display = "block";
        if (arrow) arrow.innerText = "▲";
    }

    function hydrateDrawer(id) {
        const drawer = document.getElementById("drawer-" + id);
        const item = SERIES_DATA.find(x => x.id === id);
        if (!drawer || !item) return;

        let submodelsHtml = item.subModels.map(sub => `
            <div class="submodel-item">
                <div>
                    <div class="submodel-name">${sub.name}</div>
                    <div class="submodel-desc">${sub.spec} ｜ ${sub.weight}</div>
                </div>
                <div class="submodel-price">${sub.price}</div>
            </div>
        `).join("");

        drawer.innerHTML = `
            <div style="font-size:11px; font-weight:700; color:#38bdf8; margin-bottom:6px;">代表子型號與參考價格：</div>
            ${submodelsHtml}

            <!-- Full Specs Accordion -->
            <div class="specs-accordion" style="margin-top:10px;">
                <div style="font-weight: 700; color: #38bdf8; margin-bottom: 6px; display: flex; justify-content: space-between;">
                    <span>五大零件規格相容檢定</span>
                    <span style="color: #facc15;">${item.ucsRatingText}</span>
                </div>
                <div class="specs-row"><span class="specs-k">前 / 後開檔 O.L.D.:</span><span class="specs-v">${item.specs.frontOld} / ${item.specs.rearOld}</span></div>
                <div class="specs-row"><span class="specs-k">座管外徑規格:</span><span class="specs-v">${item.specs.seatpost}</span></div>
                <div class="specs-row"><span class="specs-k">豎管頭碗系統:</span><span class="specs-v">${item.specs.headsetStem}</span></div>
                <div class="specs-row"><span class="specs-k">傳動變速相容:</span><span class="specs-v">${item.specs.drivetrain}</span></div>
                <div class="specs-row"><span class="specs-k">煞車制動夾具:</span><span class="specs-v">${item.specs.brakes}</span></div>
            </div>

            <!-- Single Bike Mini Radar SVG -->
            <div style="margin-top:12px; text-align:center; background:#0f172a; padding:10px; border-radius:6px; border:1px solid var(--border-color);">
                <div style="font-size:11px; font-weight:700; color:#cbd5e1; margin-bottom:4px;">六角多維評測雷達 (6-Axis Radar)</div>
                ${renderCompareRadarSvg([item], 280)}
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">📍 台灣總代理與售後保固條款</div>
                <div class="drawer-section-body">${item.twWarrantyCoverage}</div>
            </div>

            <div class="drawer-section trap">
                <div class="drawer-section-title">⚠️ 二手選購避坑指南與通病檢查要點</div>
                <div class="drawer-section-body">${item.buyingTraps}</div>
            </div>

            <button class="hero-quick-btn" style="width:100%; justify-content:center; margin-top:10px;" onclick="openShopForBrand('${item.brand}')">
                🏪 尋找全台 ${item.brand} 專業改裝/保養名店 ↗
            </button>
        `;

        drawer.setAttribute("data-hydrated", "true");
    }

    // Focus Card helper
    function focusCard(id) {
        let el = document.getElementById("card-" + id);
        if (!el) {
            resetAllFilters();
            // ensure card is in DOM batch
            const idx = currentFilteredList.findIndex(x => x.id === id);
            if (idx >= renderedCount) {
                renderedCount = idx + 1;
                const grid = document.getElementById("seriesGrid");
                grid.innerHTML = currentFilteredList.slice(0, renderedCount).map(item => renderCardHtml(item)).join("");
            }
            el = document.getElementById("card-" + id);
        }
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add("highlight-focus");
            setTimeout(() => {
                el.classList.remove("highlight-focus");
            }, 3000);

            toggleDrawer(id);
        }
    }

    // Pin & Compare
    function togglePin(id) {
        const idx = pinnedIds.indexOf(id);
        if (idx >= 0) {
            pinnedIds.splice(idx, 1);
        } else {
            if (pinnedIds.length >= 4) {
                showToast("⚠️ 比對欄位已達上限 (最多同時釘選 4 款車系)！請先移除既有釘選車系。");
                return;
            }
            pinnedIds.push(id);
        }
        updatePinDock();
        syncStateToHash();
        
        const btn = document.getElementById("pin-btn-" + id);
        if (btn) {
            const isPinned = pinnedIds.includes(id);
            btn.className = isPinned ? 'card-pin-btn pinned' : 'card-pin-btn';
            btn.innerText = isPinned ? '✓ 已釘選' : '📌 釘選';
        }
    }

    function clearAllPinned() {
        const prev = [...pinnedIds];
        pinnedIds = [];
        updatePinDock();
        syncStateToHash();
        prev.forEach(id => {
            const btn = document.getElementById("pin-btn-" + id);
            if (btn) {
                btn.className = 'card-pin-btn';
                btn.innerText = '📌 釘選';
            }
        });
    }

    function updatePinDock() {
        const dock = document.getElementById("compareDock");
        const chips = document.getElementById("dockChips");
        if (!dock) return;

        if (pinnedIds.length === 0) {
            dock.classList.remove("visible");
            return;
        }

        dock.classList.add("visible");
        chips.innerHTML = pinnedIds.map(id => {
            const item = SERIES_DATA.find(x => x.id === id);
            return `
                <div class="dock-chip">
                    <span>${item.id} ${item.brand}</span>
                    <span class="del-btn" onclick="togglePin('${id}')">&times;</span>
                </div>
            `;
        }).join("");
    }

    // Filter computation logic
    function getFilteredData() {
        let list = SERIES_DATA.filter(item => {
            if (currentFilter.camp !== 'all') {
                if (currentFilter.camp === 'ebike') {
                    if (!item.isEbike && item.campCode !== 'ebike') return false;
                } else if (item.campCode !== currentFilter.camp) {
                    return false;
                }
            }
            if (currentFilter.wheel !== 'all') {
                if (currentFilter.wheel === '8-14' && !['8', '12', '14'].includes(item.wheelSizeCat)) return false;
                else if (currentFilter.wheel === '16' && item.wheelSizeCat !== '16') return false;
                else if (currentFilter.wheel === '18' && item.wheelSizeCat !== '18') return false;
                else if (currentFilter.wheel === '20' && item.wheelSizeCat !== '20') return false;
                else if (currentFilter.wheel === '24+' && !['24', '26', '700C'].includes(item.wheelSizeCat)) return false;
            }
            if (currentFilter.folding !== 'all' && item.foldingCategory !== currentFilter.folding) {
                return false;
            }
            if (currentFilter.lifecycle !== 'all') {
                if (currentFilter.lifecycle === 'COLLECTIBLE_VINTAGE' || currentFilter.lifecycle === 'COLLECTORS_EDITION') {
                    if (item.productionStatus !== 'COLLECTIBLE_VINTAGE' && item.productionStatus !== 'COLLECTORS_EDITION') return false;
                } else if (currentFilter.lifecycle === 'DORMANT_DEFUNCT' || currentFilter.lifecycle === 'BRAND_DORMANT') {
                    if (item.productionStatus !== 'DORMANT_DEFUNCT' && item.productionStatus !== 'BRAND_DORMANT') return false;
                } else if (item.productionStatus !== currentFilter.lifecycle) {
                    return false;
                }
            }
            if (currentFilter.channel !== 'all' && item.twChannelAuthority !== currentFilter.channel) {
                return false;
            }
            if (item.priceRange[0] > currentFilter.maxPrice) {
                return false;
            }
            if (item.ucsScore < currentFilter.minUcs) {
                return false;
            }
            // Calibrated thresholds for de-inflated objective scores (ADR 20261105)
            if (currentFilter.orientation === 'commute' && item.scores.commute < 7.5) return false;
            if (currentFilter.orientation === 'sport' && item.scores.sport < 7.5) return false;
            if (currentFilter.orientation === 'balanced' && (item.scores.commute < 6.2 || item.scores.sport < 6.2)) return false;

            if (currentFilter.search) {
                const q = currentFilter.search.toLowerCase();
                const matchStr = (
                    item.id + " " +
                    item.brand + " " +
                    item.seriesName + " " +
                    item.englishName + " " +
                    item.camp + " " +
                    item.foldingType + " " +
                    (item.foldingCategory || "") + " " +
                    (item.aliases ? item.aliases.join(" ") : "") + " " +
                    item.wheelSize + " " +
                    (item.productionStatus || "") + " " +
                    (item.twDistributor || "") + " " +
                    (item.twChannelAuthority || "") + " " +
                    (item.twWarrantyCoverage || "") + " " +
                    (item.partsFriction || "") + " " +
                    (item.publicTransitFit || "") + " " +
                    (item.buyingTraps || "") + " " +
                    item.specs.drivetrain + " " +
                    item.specs.frontOld + " " +
                    item.specs.rearOld + " " +
                    item.twChannel + " " +
                    item.keyFeatures.join(" ") + " " +
                    item.subModels.map(s => s.name + " " + s.spec).join(" ")
                ).toLowerCase();

                if (!matchStr.includes(q)) return false;
            }
            return true;
        });

        list.sort((a, b) => {
            switch (currentFilter.sortBy) {
                case 'price_asc': return a.medianPrice - b.medianPrice;
                case 'price_desc': return b.medianPrice - a.medianPrice;
                case 'weight_asc': return a.weightKg - b.weightKg;
                case 'volume_asc': return a.foldedVolumeL - b.foldedVolumeL;
                case 'sport_desc': return b.scores.sport - a.scores.sport;
                case 'commute_desc': return b.scores.commute - a.scores.commute;
                case 'ucs_desc': return b.ucsScore - a.ucsScore;
                case 'id_asc':
                default: return a.id.localeCompare(b.id, undefined, { numeric: true });
            }
        });

        return list;
    }

    function applyFilters() {
        currentFilter.search = document.getElementById("searchInput").value.trim();
        currentFilter.sortBy = document.getElementById("sortSelect").value;
        currentFilter.wheel = document.getElementById("wheelFilter").value;
        currentFilter.folding = document.getElementById("foldingFilter").value;
        currentFilter.lifecycle = document.getElementById("lifecycleFilter").value;
        currentFilter.channel = document.getElementById("channelFilter").value;
        currentFilter.minUcs = parseFloat(document.getElementById("ucsFilter").value) || 0;
        currentFilter.orientation = document.getElementById("orientationFilter").value;
        currentFilter.maxPrice = parseInt(document.getElementById("priceMaxSlider").value, 10) || 250000;

        updateActiveFilterBadges();
        renderSeriesGrid();
        renderQuadrant();
        syncStateToHash();
    }

    function filterByCamp(camp) {
        currentFilter.camp = camp;
        document.querySelectorAll(".camp-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-camp") === camp);
        });
        applyFilters();
    }

    function updatePriceSlider(val) {
        const display = document.getElementById("priceDisplay");
        if (val >= 250000) {
            display.innerText = "不限";
        } else {
            display.innerText = "≤ NT$ " + parseInt(val, 10).toLocaleString();
        }
        applyFilters();
    }

    function updateActiveFilterBadges() {
        const descEl = document.getElementById("activeFilterDesc");
        if (!descEl) return;
        const tags = [];
        if (currentFilter.camp !== 'all') tags.push(`陣營: ${currentFilter.camp}`);
        if (currentFilter.wheel !== 'all') tags.push(`輪徑: ${currentFilter.wheel}`);
        if (currentFilter.folding !== 'all') tags.push(`型態: ${currentFilter.folding}`);
        if (currentFilter.lifecycle !== 'all') tags.push(`生命週期: ${currentFilter.lifecycle}`);
        if (currentFilter.channel !== 'all') tags.push(`通路: ${currentFilter.channel}`);
        if (currentFilter.maxPrice < 250000) tags.push(`預算 ≤ $${currentFilter.maxPrice.toLocaleString()}`);
        if (currentFilter.minUcs > 0) tags.push(`UCS ≥ ${currentFilter.minUcs}★`);
        if (currentFilter.orientation !== 'all') tags.push(`取向: ${currentFilter.orientation}`);
        if (currentFilter.search) tags.push(`關鍵字: "${currentFilter.search}"`);

        descEl.innerHTML = tags.map(t => `<span class="dock-chip" style="display:inline-flex; font-size:11px; padding:2px 6px;">${t}</span>`).join(" ");
    }

    function resetAllFilters() {
        document.getElementById("searchInput").value = "";
        document.getElementById("sortSelect").value = "id_asc";
        document.getElementById("wheelFilter").value = "all";
        document.getElementById("foldingFilter").value = "all";
        document.getElementById("lifecycleFilter").value = "all";
        document.getElementById("channelFilter").value = "all";
        document.getElementById("ucsFilter").value = "0";
        document.getElementById("orientationFilter").value = "all";
        document.getElementById("priceMaxSlider").value = "250000";
        document.getElementById("priceDisplay").innerText = "不限";

        currentFilter = {
            camp: 'all',
            wheel: 'all',
            folding: 'all',
            lifecycle: 'all',
            channel: 'all',
            maxPrice: 250000,
            minUcs: 0,
            orientation: 'all',
            search: '',
            sortBy: 'id_asc'
        };

        document.querySelectorAll(".camp-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-camp") === 'all');
        });

        updateActiveFilterBadges();
        applyFilters();
    }


    // Rubric Explanation Modal
    function openRubricModal() {
        const modal = document.getElementById("rubricModal");
        if (modal) modal.classList.add("open");
    }
    function closeRubricModal() {
        const modal = document.getElementById("rubricModal");
        if (modal) modal.classList.remove("open");
    }
