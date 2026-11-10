    // Radar Chart Engine (Inline SVG - ADR 20261105 Compliant)
    function calculateRadarScores(b) {
        const sc = b.scores || {};
        const wScore = sc.weight !== undefined ? sc.weight : Math.max(1, Math.min(10, 10.0 - ((b.weightKg - 7.0) / 8.0) * 8.0));
        let vScore = 1.0;
        if (sc.volume !== undefined) {
            vScore = sc.volume;
        } else if (b.foldingCategory !== 'nonfold') {
            vScore = Math.max(1, Math.min(10, 10.0 - ((b.foldedVolumeL - 85.0) / 165.0) * 8.0));
        }
        const rScore = sc.rigidity !== undefined ? sc.rigidity : (b.scores ? b.scores.rigidity : 7.0);
        const mScore = sc.moddability !== undefined ? sc.moddability : Math.max(1, Math.min(10, (b.ucsScore * 2.0)));
        const sResale = sc.resale !== undefined ? sc.resale : Math.max(1, Math.min(10, (b.resaleRetention - 1.0) * 2.0 + 2.0));
        const cpScore = sc.cp !== undefined ? sc.cp : Math.max(1.5, Math.min(10, 10.0 - (Math.log10(b.medianPrice) - 3.8) * 5.0));

        return [
            { name: "輕量羽量", val: wScore, spec: `${b.weightKg}kg` },
            { name: "收折緊湊", val: vScore, spec: b.foldingCategory === 'nonfold' ? '不可折疊' : `${b.foldedVolumeL}L` },
            { name: "巡航剛性", val: rScore, spec: `${b.wheelbaseMm}mm` },
            { name: "通用改裝", val: mScore, spec: `${b.ucsRatingText}` },
            { name: "保值流動", val: sResale, spec: `${b.resaleRetention}星` },
            { name: "性價比", val: cpScore, spec: `$${Math.round(b.medianPrice/1000)}k` }
        ];
    }

    function renderCompareRadarSvg(bikes, size = 360) {
        const center = size / 2;
        const radius = size * 0.38;
        const angles = [
            -Math.PI / 2,
            -Math.PI / 6,
            Math.PI / 6,
            Math.PI / 2,
            5 * Math.PI / 6,
            7 * Math.PI / 6
        ];
        const labels = ["輕量羽量 (Weight)", "收折緊湊 (Volume)", "巡航剛性 (Rigidity)", "通用改裝 (UCS)", "保值流動 (Resale)", "性價比 (CP)"];
        const bikeColors = ["#f59e0b", "#38bdf8", "#10b981", "#f43f5e"];

        // 5 Grid Hexagons
        let grids = [0.2, 0.4, 0.6, 0.8, 1.0].map(pct => {
            const pts = angles.map(a => `${center + radius * pct * Math.cos(a)},${center + radius * pct * Math.sin(a)}`).join(" ");
            return `<polygon points="${pts}" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="${pct === 1.0 ? 'none' : '2,2'}" />`;
        }).join("");

        // Radial Axis Lines & Labels
        let axes = angles.map((a, i) => {
            const x2 = center + radius * Math.cos(a);
            const y2 = center + radius * Math.sin(a);
            const lx = center + (radius + 20) * Math.cos(a);
            const ly = center + (radius + 20) * Math.sin(a);
            const anchor = Math.abs(Math.cos(a)) < 0.1 ? "middle" : (Math.cos(a) > 0 ? "start" : "end");
            return `
                <line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="1" />
                <text x="${lx}" y="${ly + 4}" fill="#94a3b8" font-size="10.5" font-weight="700" text-anchor="${anchor}">${labels[i]}</text>
            `;
        }).join("");

        // Bike Polygons
        let bikePolygons = bikes.map((b, bIdx) => {
            const color = bikeColors[bIdx % bikeColors.length];
            const scores = calculateRadarScores(b);
            const pts = scores.map((sc, i) => {
                const norm = Math.max(0.1, Math.min(1.0, sc.val / 10.0));
                const a = angles[i];
                return `${center + radius * norm * Math.cos(a)},${center + radius * norm * Math.sin(a)}`;
            }).join(" ");

            const dots = scores.map((sc, i) => {
                const norm = Math.max(0.1, Math.min(1.0, sc.val / 10.0));
                const a = angles[i];
                const cx = center + radius * norm * Math.cos(a);
                const cy = center + radius * norm * Math.sin(a);
                const tip = `${b.brand} ${labels[i]}: ${sc.val.toFixed(1)}/10 (${sc.spec})`;
                return `
                    <g class="radar-point-target" style="cursor:pointer;" tabindex="0" role="button" aria-label="${tip}">
                        <circle cx="${cx}" cy="${cy}" r="4" fill="${color}" />
                        <circle cx="${cx}" cy="${cy}" r="14" fill="transparent" class="radar-sensor-circle" onclick="showToast('${tip.replace(/'/g, "\'")}')">
                            <title>${tip}</title>
                        </circle>
                    </g>
                `;
            }).join("");

            return `
                <polygon points="${pts}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2.5" />
                ${dots}
            `;
        }).join("");

        // Legend
        let legend = `
            <div style="display:flex; justify-content:center; gap:14px; margin-top:8px; flex-wrap:wrap;">
                ${bikes.map((b, i) => `
                    <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#fff;">
                        <span style="width:12px; height:12px; border-radius:2px; background:${bikeColors[i % bikeColors.length]};"></span>
                        <span>${b.id} ${b.brand} (${b.seriesName.substring(0, 12)})</span>
                    </div>
                `).join("")}
            </div>
        `;

        return `
            <div style="display:inline-block; max-width:100%;">
                <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible;">
                    ${grids}
                    ${axes}
                    ${bikePolygons}
                </svg>
                ${legend}
            </div>
        `;
    }

    // Open Compare Modal
    function openCompareModal() {
        if (pinnedIds.length < 2) {
            showToast("⚠️ 請至少釘選 2 款車系進行橫向比對！");
            return;
        }
        const modal = document.getElementById("compareModal");
        const body = document.getElementById("compareModalBody");
        const selectedBikes = pinnedIds.map(id => SERIES_DATA.find(x => x.id === id));

        const rows = [
            { key: '品牌與車系全名', fn: b => `<strong>${b.brand}</strong><br>${b.seriesName}` },
            { key: '陣營定位', fn: b => `<span style="color:#38bdf8;">${b.camp}</span>` },
            { key: '台灣實售價 / 落地TCO', fn: b => `NT$ ${b.priceRange[0].toLocaleString()} ~ ${b.priceRange[1].toLocaleString()}<br><small style="color:#94a3b8;">初裝TCO: $${b.tcoEstimate.toLocaleString()}</small>` },
            { key: '成車整備重量 ｜ 級距', fn: b => `<strong style="font-size:15px; color:#facc15;">${b.weightKg} kg</strong> (${b.weightRange[0]}~${b.weightRange[1]}kg)` },
            { key: '展開前騎乘幾何 ｜ 體積', fn: b => `${b.unfoldedSizeCm[0]} × ${b.unfoldedSizeCm[1]} × ${b.unfoldedSizeCm[2]} cm<br><span style="color:#94a3b8;">展開體積: ~${((b.unfoldedSizeCm[0]*b.unfoldedSizeCm[1]*b.unfoldedSizeCm[2])/1000).toFixed(0)} L</span>` },
            { key: '折疊後收折尺寸 ｜ 體積', fn: b => `${b.foldedSizeCm[0]} × ${b.foldedSizeCm[1]} × ${b.foldedSizeCm[2]} cm<br><strong style="color:#38bdf8; font-size:14px;">${b.foldedVolumeL} L</strong>` },
            { key: '摺疊前後體積縮減率', fn: b => {
                if (b.foldingCategory === 'nonfold') return `<strong style="color:#94a3b8;">不可折疊小徑跑車 (0%)</strong>`;
                return `<strong style="color:#34d399;">縮減 ${(((1 - b.foldedVolumeL / ((b.unfoldedSizeCm[0]*b.unfoldedSizeCm[1]*b.unfoldedSizeCm[2])/1000)))*100).toFixed(0)}%</strong><br><small style="color:#94a3b8;">壓縮至 ${((b.foldedVolumeL / ((b.unfoldedSizeCm[0]*b.unfoldedSizeCm[1]*b.unfoldedSizeCm[2])/1000))*100).toFixed(1)}%</small>`;
            } },
            { key: '軸距幾何 ｜ 穩定性分析', fn: b => `軸距: <strong>${b.wheelbaseMm} mm</strong><br><small style="color:#94a3b8;">${b.wheelbaseMm < 950 ? '超靈活短軸距' : b.wheelbaseMm > 1030 ? '公路穩定長軸距' : '都會標準軸距'}</small>` },
            { key: '輪徑與胎寬容許上限', fn: b => `${b.wheelSize}<br><span style="color:#cbd5e1;">相容胎寬: ${b.tireClearance}</span>` },
            { key: '折疊機構型態 ｜ 秒數', fn: b => `${b.foldingType}<br>約 <strong>${b.foldSeconds} 秒</strong>` },
            { key: '五大零件相容星等', fn: b => `<strong style="color:#facc15;">${b.ucsRatingText}</strong>` },
            { key: '前 / 後開檔 O.L.D.', fn: b => `${b.specs.frontOld}<br>${b.specs.rearOld}` },
            { key: '座管外徑規格', fn: b => `${b.specs.seatpost}` },
            { key: '豎管頭碗系統', fn: b => `${b.specs.headsetStem}` },
            { key: '傳動變速相容', fn: b => `${b.specs.drivetrain}` },
            { key: '煞車制動夾具', fn: b => `${b.specs.brakes}` },
            { key: '每公斤成本 C/P 分析', fn: b => `NT$ <strong>${Math.round(b.medianPrice / b.weightKg).toLocaleString()}</strong> / kg` },
            { key: '雙能指數 (運動/通勤)', fn: b => `運動: <strong>${b.scores.sport}/10</strong> ｜ 通勤: <strong>${b.scores.commute}/10</strong>` },
            { key: '六角客觀評測矩陣', fn: b => {
                const sc = calculateRadarScores(b);
                const abbrs = { "輕量羽量": "羽量", "收折緊湊": "緊湊", "巡航剛性": "剛性", "通用改裝": "改裝", "保值流動": "保值", "性價比": "性價" };
                return `<div class="score-matrix-cell" style="display:flex; flex-direction:column; gap:4px; font-size:11px; min-width:70px;">
                    ${sc.map(s => `
                        <div class="score-chip" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:3px; gap:6px;">
                            <span style="color:#94a3b8; font-size:10.5px;">${abbrs[s.name] || s.name}</span>
                            <strong style="color:#38bdf8; font-family:monospace; font-size:11px;">${s.val.toFixed(1)}</strong>
                        </div>
                    `).join('')}
                </div>`;
            } },
            { key: '權威來源與審計信心', fn: b => {
                const srcs = b.sources || (b.officialUrl ? [b.officialUrl] : []);
                return `<div style="font-size:11px; line-height:1.4;">
                    <span style="display:inline-block; padding:1px 5px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); border-radius:3px; color:#38bdf8; font-weight:700; margin-bottom:4px;">高信心審計 (Tier 3)</span>
                    ${srcs.slice(0, 2).map((url, idx) => `<div style="margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;"><a href="${url}" target="_blank" rel="noopener" style="color:#94a3b8; text-decoration:underline;">🔗 查證來源 [${idx+1}]</a></div>`).join('')}
                </div>`;
            } },
            { key: '大眾運輸合規評級', fn: b => `${b.transportRating}` },
            { key: '台灣購買與代理售後', fn: b => `${b.twChannel}` },
            { key: '生命週期狀態 ｜ 年式', fn: b => {
                const sm = {
                    ACTIVE_IN_PRODUCTION: '🟢 現役量產',
                    ACTIVE_IN_STOCK: '🟡 庫存在售',
                    DISCONTINUED_CLASSIC: '🟠 停產名駒',
                    COLLECTIBLE_VINTAGE: '🟣 典藏逸品',
                    COLLECTORS_EDITION: '🟣 典藏逸品',
                    DORMANT_DEFUNCT: '⚪ 品牌休眠',
                    BRAND_DORMANT: '⚪ 品牌休眠'
                };
                return `<strong>${sm[b.productionStatus] || b.productionStatus}</strong><br><small style="color:#94a3b8;">首發 ${b.firstReleaseYear} ~ 最新 ${b.latestModelYear}</small>`;
            } },
            { key: '台灣總代理與通路層級', fn: b => `<strong style="color:#38bdf8;">${b.twChannelAuthority}</strong><br><small style="color:#cbd5e1;">${b.twDistributor}</small>` },
            { key: '原廠保固與售後條款', fn: b => `<small style="color:#cbd5e1;">${b.twWarrantyCoverage}</small>` },
            { key: '專用耗材取得摩擦度', fn: b => `<strong style="color:#34d399;">${b.partsFriction}</strong>` },
            { key: '二手保值星等評級', fn: b => `<strong style="color:#facc15;">${'★'.repeat(b.resaleRetention || 3)}${'☆'.repeat(5 - (b.resaleRetention || 3))} (${b.resaleRetention}星)</strong>` },
            { key: '大眾運輸友善度評估', fn: b => `<strong style="color:#38bdf8;">${b.publicTransitFit}</strong><br><small style="color:#94a3b8;">${b.transportRating}</small>` },
            { key: '二手選購避坑與通病檢測', fn: b => `<small style="color:#fed7aa;">${b.buyingTraps}</small>` }
        ];

        let radarBoxHtml = `
            <div style="background:#0f172a; border:1px solid var(--border-color); border-radius:8px; padding:16px; margin-bottom:20px; text-align:center;">
                <div style="font-weight:700; color:#38bdf8; font-size:14px; margin-bottom:12px;">
                    📊 4 車六角多維評測雷達 (Inline SVG Multi-Series Radar Overlay)
                </div>
                ${renderCompareRadarSvg(selectedBikes, 360)}
            </div>
        `;

        let tableHtml = `
            <table class="compare-table">
                <thead>
                    <tr>
                        <th class="sticky-col">對比維度</th>
                        ${selectedBikes.map(b => `
                            <th class="bike-col">
                                <div style="width: 100%; height: 80px; margin-bottom: 8px; border-radius: 6px; overflow: hidden; background: #0b0f17; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; position: relative;">
                                    <span style="font-size: 11px; color: #64748b; position: absolute; pointer-events: none; user-select: none;">圖片尚未呈現</span>
                                    <img src="${b.imageUrl}" alt="${b.seriesName}" style="max-width: 100%; max-height: 100%; object-fit: contain; position: relative; z-index: 1;" onerror="this.style.display='none'" />
                                </div>
                                <div style="font-weight: 700; color: #fff;">${b.id} ${b.brand}</div>
                                <button class="modal-remove-bike-btn" onclick="togglePin('${b.id}'); if(pinnedIds.length>=2){ openCompareModal(); } else { closeCompareModal(); }">
                                    移除 &times;
                                </button>
                            </th>
                        `).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => `
                        <tr>
                            <th class="sticky-col">${r.key}</th>
                            ${selectedBikes.map(b => `<td>${r.fn(b)}</td>`).join("")}
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;

        body.innerHTML = radarBoxHtml + tableHtml;
        modal.classList.add("open");
    }

    function closeCompareModal() {
        const m = document.getElementById("compareModal");
        if (m) m.classList.remove("open");
    }

    function openGuideModal() {
        const m = document.getElementById("guideModal");
        if (m) m.classList.add("open");
    }
    function closeGuideModal() {
        const m = document.getElementById("guideModal");
        if (m) m.classList.remove("open");
    }

    // Keyboard ESC closes all modals
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeCompareModal();
            closeGuideModal();
            closeGearModal();
            closeTrunkModal();
            closeQuizModal();
            closeShopDrawer();
        }
    });

    // Macro Analytics Toggle
    function toggleMarketAnalytics() {
        const el = document.getElementById("marketAnalyticsContent");
        const btn = document.getElementById("marketAnalyticsToggleBtn");
        if (!el) return;
        if (el.style.display === "none") {
            el.style.display = "block";
            btn.innerText = "收合分析 ▲";
        } else {
            el.style.display = "none";
            btn.innerText = "展開分析 ▼";
        }
    }

    // Visual Tab Switch (Quadrant vs Ladder)
    function switchVisualTab(tab) {
        document.getElementById("btnTabQuadrant").classList.toggle("active", tab === 'quadrant');
        document.getElementById("btnTabLadder").classList.toggle("active", tab === 'ladder');
        document.getElementById("viewQuadrant").style.display = tab === 'quadrant' ? 'grid' : 'none';
        document.getElementById("viewLadder").style.display = tab === 'ladder' ? 'block' : 'none';
        document.getElementById("quadrantViewSelector").style.display = tab === 'quadrant' ? 'flex' : 'none';
        if (tab === 'ladder') renderLadder();
        if (tab === 'quadrant') {
            setTimeout(() => {
                renderQuadrant(true);
            }, 30);
        }
    }

    // Ladder Charts
    function switchLadderCategory(cat, btn) {
        currentLadderCategory = cat;
        document.querySelectorAll(".ladder-tab-btn").forEach(b => b.classList.remove("active"));
        if (btn) btn.classList.add("active");
        renderLadder();
    }

    function toggleAllLadder() {
        showAllLadder = !showAllLadder;
        document.getElementById("btnToggleAllLadder").innerText = showAllLadder ? "收合排行榜 (前 15 名) ▴" : "展開全 109 車系完整排行 ▾";
        renderLadder();
    }

    function renderLadder() {
        const grid = document.getElementById("ladderGrid");
        if (!grid) return;

        let sorted = [...SERIES_DATA];
        let valExtractor, valFormatter, maxVal, isReverse = false;

        switch (currentLadderCategory) {
            case 'weight':
                sorted.sort((a, b) => a.weightKg - b.weightKg);
                valExtractor = d => d.weightKg;
                valFormatter = v => v.toFixed(1) + " kg";
                maxVal = 25.0;
                isReverse = true;
                break;
            case 'volume':
                sorted.sort((a, b) => a.foldedVolumeL - b.foldedVolumeL);
                valExtractor = d => d.foldedVolumeL;
                valFormatter = v => v.toFixed(1) + " L";
                maxVal = 320.0;
                isReverse = true;
                break;
            case 'sport':
                sorted.sort((a, b) => b.scores.sport - a.scores.sport);
                valExtractor = d => d.scores.sport;
                valFormatter = v => v.toFixed(1) + "★";
                maxVal = 10.0;
                break;
            case 'ucs':
                sorted.sort((a, b) => b.ucsScore - a.ucsScore);
                valExtractor = d => d.ucsScore;
                valFormatter = v => v.toFixed(1) + "★";
                maxVal = 5.0;
                break;
            case 'price':
                sorted.sort((a, b) => a.medianPrice - b.medianPrice);
                valExtractor = d => d.medianPrice;
                valFormatter = v => "$" + v.toLocaleString();
                maxVal = 200000;
                isReverse = true;
                break;
        }

        const displayList = showAllLadder ? sorted : sorted.slice(0, 15);

        grid.innerHTML = displayList.map((item, idx) => {
            const rank = idx + 1;
            let podiumClass = "";
            if (rank === 1) podiumClass = "podium-1";
            else if (rank === 2) podiumClass = "podium-2";
            else if (rank === 3) podiumClass = "podium-3";

            const rawVal = valExtractor(item);
            let barPct = Math.min(100, Math.max(5, (rawVal / maxVal) * 100));
            if (isReverse) {
                barPct = Math.min(100, Math.max(5, (1 - (rawVal / maxVal)) * 100));
            }

            return `
                <div class="ladder-row" onclick="focusCard('${item.id}')">
                    <div class="ladder-rank ${podiumClass}">${rank}</div>
                    <div class="ladder-info">
                        <div class="title">${item.id} ${item.brand} ${item.seriesName}</div>
                        <div class="meta">${item.camp} ｜ ${item.wheelSize} ｜ ${item.foldingType}</div>
                    </div>
                    <div class="ladder-bar-wrap">
                        <div class="ladder-val">${valFormatter(rawVal)}</div>
                        <div class="ladder-bar-bg">
                            <div class="ladder-bar-fill" style="width: ${barPct}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // Canvas Interactive Quadrant Plot (Full-Bleed Responsive with Retina/HiDPI Support)
    function initCanvas() {
        const canvas = document.getElementById("quadrantCanvas");
        const holder = document.getElementById("canvasHolder");
        if (!canvas) return;

        canvas.addEventListener("mousemove", handleCanvasHover);
        canvas.addEventListener("click", handleCanvasClick);
        canvas.addEventListener("mouseleave", () => {
            hoveredPoint = null;
            const tt = document.getElementById("quadrantTooltip");
            if (tt) tt.style.display = "none";
            renderQuadrant(false);
        });

        // Dynamic ResizeObserver ensures quadrant plot is 100% full-bleed across all screen widths & DPRs
        if (typeof ResizeObserver !== "undefined" && holder) {
            let resizeTimer;
            const ro = new ResizeObserver(() => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    renderQuadrant(true);
                }, 30);
            });
            ro.observe(holder);
        } else {
            window.addEventListener("resize", () => {
                renderQuadrant(true);
            });
        }

        renderQuadrant(true);
    }

    function renderQuadrant(rebuildPoints = true) {
        const canvas = document.getElementById("quadrantCanvas");
        const holder = document.getElementById("canvasHolder");
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext("2d");

        // Measure true layout dimensions in CSS pixels
        const rect = (holder && holder.getBoundingClientRect) ? holder.getBoundingClientRect() : { width: 800, height: 480 };
        const cssWidth = Math.max(320, Math.floor(rect.width) || 800);
        const cssHeight = Math.max(380, Math.floor(rect.height) || 480);
        const dpr = (typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1;

        // Sync canvas buffer to physical pixels to eliminate DPR scaling gap & blur
        const targetW = Math.floor(cssWidth * dpr);
        const targetH = Math.floor(cssHeight * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
        }

        // Apply scale transform so all drawing coordinates match CSS pixels 1:1
        if (ctx.setTransform) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else if (ctx.scale) {
            ctx.scale(dpr, dpr);
        }

        const width = cssWidth;
        const height = cssHeight;
        const pad = { left: 55, top: 25, right: 30, bottom: 45 };
        const plotW = Math.max(100, width - pad.left - pad.right);
        const plotH = Math.max(100, height - pad.top - pad.bottom);

        const mode = document.getElementById("quadrantViewMode") ? document.getElementById("quadrantViewMode").value : "sport_commute";

        let xLabel, yLabel, xMin, xMax, yMin, yMax, getX, getY, qLabels;

        if (mode === "sport_commute") {
            xLabel = "短距都會通勤便捷 (Commute Score) → [8.5+ 捷運神器]";
            yLabel = "純血長途運動性能 (Sport Score) ↑ [8.5+ 公路跑旅]";
            xMin = 4.0; xMax = 10.5;
            yMin = 1.5; yMax = 10.5;
            getX = d => d.scores.commute;
            getY = d => d.scores.sport;
            qLabels = [
                { text: "【公路巡航旗艦】\n極速剛性・大齒比", x: pad.left + plotW * 0.22, y: pad.top + plotH * 0.18 },
                { text: "【全能雙棲巔峰】\n運動剛性兼具通勤極限", x: pad.left + plotW * 0.78, y: pad.top + plotH * 0.18 },
                { text: "【休閒代步基礎】\n國民休閒・短途慢踩", x: pad.left + plotW * 0.22, y: pad.top + plotH * 0.82 },
                { text: "【都會極速接駁】\n秒收緊湊・推行轉乘天花板", x: pad.left + plotW * 0.78, y: pad.top + plotH * 0.82 }
            ];
        } else if (mode === "portability_rigidity") {
            xLabel = "便攜與折疊緊湊度 (Portability) → [極致收折 10分]";
            yLabel = "車架抗扭與巡航剛性 (Rigidity) ↑ [無鉸鏈跑車感 10分]";
            xMin = 3.5; xMax = 10.5;
            yMin = 3.8; yMax = 10.5;
            getX = d => d.scores.portability;
            getY = d => d.scores.rigidity;
            qLabels = [
                { text: "【重裝大車路感】\n全尺寸剛性・收折偏大", x: pad.left + plotW * 0.22, y: pad.top + plotH * 0.18 },
                { text: "【工藝神級交集】\n高剛性同時具備極致收折", x: pad.left + plotW * 0.78, y: pad.top + plotH * 0.18 },
                { text: "【休閒代步取向】\n輕鬆慢騎・經濟親民", x: pad.left + plotW * 0.22, y: pad.top + plotH * 0.82 },
                { text: "【羽量代步微折】\n極限收納・隨手拎起", x: pad.left + plotW * 0.78, y: pad.top + plotH * 0.82 }
            ];
        } else {
            xLabel = "成車整備重量 (Weight kg) → [越左越輕羽量]";
            yLabel = "台灣實售中位價 (TWD) ↑";
            xMin = 4.0; xMax = 36.0;
            yMin = 2000; yMax = 220000;
            getX = d => d.weightKg;
            getY = d => d.medianPrice;
            qLabels = [
                { text: "【頂級羽量旗艦】\n全鈦/全碳/極致客製", x: pad.left + plotW * 0.22, y: pad.top + plotH * 0.18 },
                { text: "【高階重裝/電輔】\nBosch中置/長尾載貨", x: pad.left + plotW * 0.78, y: pad.top + plotH * 0.18 },
                { text: "【極致CP羽量】\n改裝自組神車・超輕高性價", x: pad.left + plotW * 0.22, y: pad.top + plotH * 0.82 },
                { text: "【平價國民實用】\n日常通勤耐操首選", x: pad.left + plotW * 0.78, y: pad.top + plotH * 0.82 }
            ];
        }

        const toCanvasX = val => pad.left + ((Math.max(xMin, Math.min(xMax, val)) - xMin) / (xMax - xMin)) * plotW;
        const toCanvasY = val => pad.top + plotH - ((Math.max(yMin, Math.min(yMax, val)) - yMin) / (yMax - yMin)) * plotH;

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, width, height);

        const midX = pad.left + plotW / 2;
        const midY = pad.top + plotH / 2;

        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(midX, pad.top);
        ctx.lineTo(midX, pad.top + plotH);
        ctx.moveTo(pad.left, midY);
        ctx.lineTo(pad.left + plotW, midY);
        ctx.stroke();

        ctx.fillStyle = "rgba(59, 130, 246, 0.03)";
        ctx.fillRect(midX, pad.top, plotW / 2, plotH / 2);

        ctx.fillStyle = "rgba(148, 163, 184, 0.22)";
        ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        qLabels.forEach(q => {
            const lines = q.text.split("\n");
            lines.forEach((line, lIdx) => {
                ctx.fillText(line, q.x, q.y + lIdx * 18);
            });
        });

        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.strokeRect(pad.left, pad.top, plotW, plotH);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(xLabel, pad.left + plotW / 2, height - 12);

        ctx.save();
        ctx.translate(18, pad.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();

        if (rebuildPoints) {
            canvasPoints = [];
            const filtered = getFilteredData();
            const activeIds = new Set(filtered.map(x => x.id));

            SERIES_DATA.forEach(item => {
                const xv = getX(item);
                const yv = getY(item);
                const cx = toCanvasX(xv);
                const cy = toCanvasY(yv);
                const isFiltered = activeIds.has(item.id);

                canvasPoints.push({
                    x: cx,
                    y: cy,
                    radius: isFiltered ? 6 : 3.5,
                    data: item,
                    isFiltered: isFiltered
                });
            });
        }

        const campColors = {
            classic: '#f59e0b',
            boutique: '#10b981',
            mainstream: '#3b82f6',
            fullsize: '#f97316',
            taiwan: '#a855f7',
            custom: '#ec4899',
            ebike: '#06b6d4'
        };

        canvasPoints.forEach(p => {
            const isHovered = (hoveredPoint && hoveredPoint.data.id === p.data.id);
            const color = campColors[p.data.campCode] || '#38bdf8';

            ctx.beginPath();
            ctx.arc(p.x, p.y, isHovered ? 9 : p.radius, 0, Math.PI * 2);

            if (p.isFiltered) {
                ctx.fillStyle = color;
                ctx.shadowColor = isHovered ? '#fff' : color;
                ctx.shadowBlur = isHovered ? 12 : 5;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = isHovered ? 2 : 1;
                ctx.stroke();
            } else {
                ctx.fillStyle = "rgba(71, 85, 105, 0.3)";
                ctx.fill();
            }

            if (isHovered || (p.isFiltered && (p.data.id === 'S13' || p.data.id === 'S01' || p.data.id === 'S03' || p.data.id === 'S40' || p.data.id === 'S83' || p.data.id === 'S100'))) {
                ctx.fillStyle = isHovered ? '#facc15' : '#cbd5e1';
                ctx.font = isHovered ? "bold 11px sans-serif" : "9px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(p.data.id, p.x, p.y - (isHovered ? 12 : 9));
            }
        });
    }

    function handleCanvasHover(e) {
        const canvas = document.getElementById("quadrantCanvas");
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let closest = null;
        let minD = 16;

        canvasPoints.forEach(p => {
            const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
            if (dist < minD) {
                minD = dist;
                closest = p;
            }
        });

        const tt = document.getElementById("quadrantTooltip");
        if (closest) {
            hoveredPoint = closest;
            const d = closest.data;
            if (tt) {
                tt.style.display = "block";
                const ttX = (mouseX + 15 + 240 > rect.width) ? (mouseX - 235) : (mouseX + 15);
                const ttY = (mouseY - 20 < 10) ? (mouseY + 20) : (mouseY - 20);
                tt.style.left = ttX + "px";
                tt.style.top = ttY + "px";
                tt.innerHTML = `
                    <div style="font-weight:700; color:#38bdf8;">${d.id} ${d.brand} ${d.seriesName}</div>
                    <div style="color:#cbd5e1; font-size:11px; margin-top:2px;">
                        中位價: $${d.medianPrice.toLocaleString()} ｜ 重: ${d.weightKg}kg<br>
                        收折體積: ${d.foldedVolumeL}L ｜ 運動: ${d.scores.sport}★ ｜ 通勤: ${d.scores.commute}★
                    </div>
                `;
            }
            renderQuadrant(false);
        } else if (hoveredPoint) {
            hoveredPoint = null;
            if (tt) tt.style.display = "none";
            renderQuadrant(false);
        }
    }

    function handleCanvasClick() {
        if (hoveredPoint) {
            focusCard(hoveredPoint.data.id);
        }
    }

