    // Gear-Inch / Cadence Calculator Engine
    const WHEEL_SPECS = {
        "8": { name: '8" 微型 (CarryMe 32-137)', dia: 8.07, circ: 645 },
        "14": { name: '14" 極小徑 (K3 35-254)', dia: 12.80, circ: 1020 },
        "16_305": { name: '16" 305 (小16 F-16 37-305)', dia: 14.92, circ: 1190 },
        "16_349": { name: '16" 349 (小布/Mint 35-349)', dia: 16.50, circ: 1300 },
        "18": { name: '18" 355 (鳥車/IVE 37-355)', dia: 16.89, circ: 1345 },
        "20_406": { name: '20" 406 (大行/Tern 40-406)', dia: 19.13, circ: 1490 },
        "20_451": { name: '20" 451 (Verge/跑格 28-451)', dia: 19.96, circ: 1545 },
        "24_520": { name: '24" 520 (MR4跑車 25-520)', dia: 22.44, circ: 1755 },
        "26": { name: '26" 559 (傘兵/大折 50-559)', dia: 25.94, circ: 2070 },
        "700C": { name: '700C 622 (公路車 25-622)', dia: 26.46, circ: 2105 }
    };

    const INTERNAL_HUBS = {
        "none": { name: "無內變速", ratios: [1.0] },
        "bwr": { name: "Brompton BWR 3速", ratios: [0.64, 1.00, 1.57] },
        "sturmey3": { name: "Sturmey Archer 3速", ratios: [0.75, 1.00, 1.333] },
        "alfine8": { name: "Shimano Alfine 8速", ratios: [0.527, 0.644, 0.748, 0.851, 1.00, 1.223, 1.419, 1.615] },
        "alfine11": { name: "Shimano Alfine 11速", ratios: [0.527, 0.681, 0.770, 0.878, 0.995, 1.134, 1.292, 1.462, 1.667, 1.888, 2.153] },
        "rohloff": { name: "Rohloff Speedhub 14速", ratios: [0.279, 0.316, 0.360, 0.409, 0.464, 0.528, 0.600, 0.682, 0.774, 0.881, 1.00, 1.135, 1.292, 1.467] }
    };

    function openGearModal() {
        document.getElementById("gearModal").classList.add("open");
        runGearCalculator();
    }
    function closeGearModal() {
        document.getElementById("gearModal").classList.remove("open");
    }

    function runGearCalculator() {
        const wKey = document.getElementById("calcWheel").value;
        const hKey = document.getElementById("calcHub").value;
        const chainring = parseInt(document.getElementById("calcChainring").value, 10);
        const cadence = parseInt(document.getElementById("calcCadence").value, 10);
        const cassetteStr = document.getElementById("calcCassette").value;

        const wSpec = WHEEL_SPECS[wKey] || WHEEL_SPECS["16_349"];
        const hub = INTERNAL_HUBS[hKey] || INTERNAL_HUBS["none"];

        const cogs = cassetteStr.split(/[,，\s]+/).map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x) && x > 0);
        if (cogs.length === 0) cogs.push(16);

        const gears = [];
        hub.ratios.forEach((hRatio, hIdx) => {
            cogs.forEach(cog => {
                const rTotal = (chainring / cog) * hRatio;
                const gi = wSpec.dia * rTotal;
                const dev = (wSpec.circ * rTotal) / 1000;
                const spd = (dev * cadence * 60) / 1000;
                let hDesc = hub.ratios.length > 1 ? `內變檔${hIdx+1} + ` : '';
                gears.push({
                    label: `${hDesc}${cog}T`,
                    gi: gi,
                    dev: dev,
                    speed: spd
                });
            });
        });

        gears.sort((a, b) => a.gi - b.gi);
        const minGi = gears[0].gi;
        const maxGi = gears[gears.length - 1].gi;
        const gearRangePct = Math.round((maxGi / minGi) * 100);

        const scaleMax = Math.max(120, Math.ceil(maxGi / 10) * 10);

        let climbDiag = "🟢 爬坡輕鬆 (風櫃嘴 12% 坡可保持回轉)";
        if (minGi > 35) climbDiag = "🚨 爬坡極度重踩 (風櫃嘴易定杆傷膝)";
        else if (minGi > 28) climbDiag = "⚠️ 爬坡偏重 (需站姿抽車較吃力)";

        const out = document.getElementById("gearChartOutput");
        out.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <div style="font-size:13.5px; font-weight:700; color:#38bdf8;">
                    📊 各檔位 Gear-Inch 階梯與巡航時速 (@ ${cadence} RPM)
                </div>
                <div style="font-size:12px; color:#cbd5e1;">
                    總齒比跨度: <strong style="color:#facc15;">${gearRangePct}%</strong> ｜ 最輕檔: <strong>${minGi.toFixed(1)} GI</strong>
                </div>
            </div>

            <div style="margin-bottom:12px; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px; font-size:12px; border-left:3px solid #38bdf8;">
                ${climbDiag} ｜ 巡航最高速: <strong style="color:#34d399;">${gears[gears.length-1].speed.toFixed(1)} km/h</strong>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px;">
                ${gears.map((g, i) => `
                    <div style="display:flex; align-items:center; gap:8px; font-size:11.5px;">
                        <span style="width:75px; color:#94a3b8; flex-shrink:0;">${g.label}</span>
                        <div style="flex:1; height:18px; background:#1e293b; border-radius:3px; overflow:hidden; position:relative;">
                            <div style="height:100%; width:${Math.min(100, (g.gi / scaleMax) * 100)}%; background:linear-gradient(90deg, #2563eb, #38bdf8); border-radius:3px;"></div>
                            <span style="position:absolute; right:8px; top:1px; font-size:10px; font-weight:700; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.85);">${g.gi.toFixed(1)} GI</span>
                        </div>
                        <span style="width:70px; text-align:right; font-weight:700; color:#34d399; flex-shrink:0;">${g.speed.toFixed(1)} km/h</span>
                    </div>
                `).join("")}
            </div>
        `;
    }

    // Trunk Fit Simulator
    const TRUNK_MODELS = {
        "altis": { name: "Toyota Altis 12代 (國民轎車 470L)", type: "Sedan", L: 95, W: 105, H: 50, foldL: 170 },
        "cross": { name: "Toyota Corolla Cross (跨界休旅 487L)", type: "CUV", L: 82, W: 100, H: 75, foldL: 155 },
        "rav4": { name: "Toyota RAV4 5代 (中型休旅 580L)", type: "SUV", L: 95, W: 102, H: 85, foldL: 175 },
        "fit": { name: "Honda Fit 4代 (五門掀背 304L)", type: "Hatchback", L: 65, W: 98, H: 80, foldL: 145 }
    };

    function openTrunkModal() {
        document.getElementById("trunkModal").classList.add("open");
        runTrunkSimulator();
    }
    function closeTrunkModal() {
        document.getElementById("trunkModal").classList.remove("open");
    }

    function runTrunkSimulator() {
        const cKey = document.getElementById("trunkCarSelect").value;
        const bId = document.getElementById("trunkBikeSelect").value;
        const targetCount = parseInt(document.getElementById("trunkCountSelect").value, 10);
        const isFolded = document.getElementById("trunkSeatSelect") && document.getElementById("trunkSeatSelect").value === "folded";

        const car = TRUNK_MODELS[cKey] || TRUNK_MODELS["altis"];
        const bike = SERIES_DATA.find(x => x.id === bId) || SERIES_DATA[0];

        const effL = isFolded ? (car.foldL || (car.L + 75)) : car.L;
        const effW = car.W;
        const effH = car.H;

        const out = document.getElementById("trunkSimOutput");

        if (bike.foldingCategory === "nonfold") {
            out.innerHTML = `
                <div style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; padding:16px; border-radius:8px; color:#f87171;">
                    <h3 style="margin-bottom:6px;">⚠️ 警告：不可折疊小徑車</h3>
                    <p style="font-size:13px; line-height:1.5;">${bike.brand} ${bike.seriesName} 為Slant固定車架不可折疊小徑跑車！無法放入一般汽車後車廂，必須拆除前後輪裝入攜車袋或使用外部車頂架/後背架載運。</p>
                </div>
            `;
            return;
        }

        const bL = bike.foldedSizeCm[0];
        const bW = bike.foldedSizeCm[1];
        const bH = bike.foldedSizeCm[2];

        // Evaluate upright capability
        const canUpright = (bH <= effH - 3) && ((bW <= effW && bL <= effL) || (bW <= effL && bL <= effW));
        let maxUpright = 0;
        if (canUpright) {
            const u1 = Math.floor(effW / bW) * Math.floor(effL / bL);
            const u2 = Math.floor(effW / bL) * Math.floor(effL / bW);
            maxUpright = Math.max(u1, u2);
        }

        // Flat packing (thickness is bW)
        const flatThickness = bW;
        const optA = (bL <= effW && bH <= effL) ? (Math.floor(effW / bL) * Math.floor(effL / bH)) : 0;
        const optB = (bL <= effL && bH <= effW) ? (Math.floor(effL / bL) * Math.floor(effW / bH)) : 0;
        const floorCount = Math.max(optA, optB);
        const stackLayers = (floorCount > 0 && flatThickness <= effH) ? Math.floor(effH / flatThickness) : 0;
        const maxFlat = floorCount * stackLayers;

        const bestCapacity = canUpright ? Math.max(maxUpright, maxFlat) : maxFlat;
        const fitSuccess = bestCapacity >= targetCount;

        let starRating = "";
        if (bestCapacity === 0) {
            starRating = "★☆☆☆☆ (空間不足 / 需放倒後座或使用車架)";
        } else if (fitSuccess) {
            starRating = (canUpright && maxUpright >= targetCount) ? "★★★★★ (直立從容)" : (bestCapacity >= 2 ? "★★★★☆ (平躺輕鬆)" : "★★★☆☆ (剛好滿載)");
        } else {
            starRating = "★★☆☆☆ (空間緊繃 / 超出容納上限)";
        }

        out.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                <div>
                    <h3 style="font-size:15px; color:#fff;">模擬車載空間：${car.name} ${isFolded ? '(後座傾倒)' : '(常態後廂)'}</h3>
                    <div style="font-size:12px; color:var(--text-muted);">可用空間: 深度 ${effL}cm × 寬度 ${effW}cm × 高度 ${effH}cm ｜ 收折單車: ${bL}×${bW}×${bH}cm</div>
                </div>
                <div style="font-size:13px; font-weight:700; color:${fitSuccess ? '#34d399' : '#f87171'};">
                    適配評定: ${starRating}
                </div>
            </div>

            <!-- Bounding Box Wireframe Preview -->
            <div style="background:#090d16; border:1px solid #334155; border-radius:6px; padding:14px; margin-bottom:14px; text-align:center;">
                <div style="font-size:11px; color:#94a3b8; margin-bottom:6px;">行李廂俯視擺放透視 (Trunk Wireframe View)</div>
                <svg width="100%" height="160" viewBox="0 0 400 160" style="background:#0b0f17; border-radius:4px;">
                    <rect x="20" y="20" width="360" height="120" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="4,4" />
                    ${Array.from({length: Math.min(targetCount, 4)}).map((_, i) => `
                        <rect x="${40 + i * 85}" y="35" width="75" height="90" rx="4" fill="${fitSuccess ? 'rgba(56,189,248,0.25)' : 'rgba(239,68,68,0.25)'}" stroke="${fitSuccess ? '#38bdf8' : '#ef4444'}" stroke-width="1.5" />
                        <text x="${77 + i * 85}" y="85" fill="#fff" font-size="11" font-weight="700" text-anchor="middle">車體 ${i+1}</text>
                    `).join("")}
                </svg>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; margin-bottom:12px;">
                <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:4px;">
                    <span style="color:#94a3b8;">直立放置評估:</span>
                    <strong style="color:${canUpright ? '#34d399' : '#f87171'};">${canUpright ? `✅ 淨高${effH}cm可直立插放 (可容納${maxUpright}台)` : `❌ 淨高${effH}cm不足直立 (${bH}cm)，須平躺`}</strong>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:4px;">
                    <span style="color:#94a3b8;">平躺堆疊容量:</span>
                    <strong style="color:#38bdf8;">底層平鋪 ${floorCount} 台 ｜ 可疊 ${stackLayers} 層 (總計 ${maxFlat} 台)</strong>
                </div>
            </div>

            ${bestCapacity === 0 ? `
                <div style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; border-radius:6px; padding:10px 12px; font-size:12px; color:#f87171; margin-bottom:12px; line-height:1.5;">
                    🚨 <strong>裝載預警</strong>：此車款折疊尺寸 (${bL}×${bW}×${bH}cm) 超出當前行李廂淨空限制！若常態後廂無法放入，請將後座 6/4 傾倒或使用攜車架載運。
                </div>
            ` : ''}

            <!-- Rear Derailleur Rule Warning -->
            <div style="background:rgba(234,179,8,0.08); border:1px solid #eab308; border-radius:6px; padding:10px 12px; font-size:12px; color:#fde047; line-height:1.5;">
                ⚠️ <strong>後變速器朝上法則 (Rear Derailleur UP Hard Rule)</strong>：<br>
                平放收折單車時，<strong>務必確保後變速器與勾爪朝向天花板</strong>！切勿讓變速導輪朝下承受整車 12kg 重壓，否則車輛過彎震動極易壓彎尾勾，導致變速卡死輪圈！
            </div>
        `;
    }

    // Quiz Wizard Recommendation Engine
    let quizState = { budget: 'p2', scene: 's1', space: 'v2', mod: 'm2', rider: 'f1' };

    function openQuizModal() {
        document.getElementById("quizModal").classList.add("open");
        renderQuizStep();
    }
    function closeQuizModal() {
        document.getElementById("quizModal").classList.remove("open");
    }

    function initQuizModal() {
        renderQuizStep();
    }

    function setQuizAnswer(key, val) {
        quizState[key] = val;
        renderQuizStep();
    }

    function renderQuizStep() {
        const body = document.getElementById("quizModalBody");
        if (!body) return;

        body.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <!-- Q1 -->
                <div>
                    <div style="font-weight:700; color:#38bdf8; font-size:13.5px; margin-bottom:8px;">Q1. 預算預期帶 (Budget Range)</div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:8px;">
                        <button class="reset-btn ${quizState.budget==='p1'?'active':''}" style="${quizState.budget==='p1'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('budget', 'p1')">&lt; 1.5 萬 (親民高CP)</button>
                        <button class="reset-btn ${quizState.budget==='p2'?'active':''}" style="${quizState.budget==='p2'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('budget', 'p2')">1.5 ~ 3.5 萬 (主流均衡)</button>
                        <button class="reset-btn ${quizState.budget==='p3'?'active':''}" style="${quizState.budget==='p3'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('budget', 'p3')">3.5 ~ 7 萬 (進階性能)</button>
                        <button class="reset-btn ${quizState.budget==='p4'?'active':''}" style="${quizState.budget==='p4'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('budget', 'p4')">&gt; 7 萬 (奢華旗艦)</button>
                    </div>
                </div>

                <!-- Q2 -->
                <div>
                    <div style="font-weight:700; color:#38bdf8; font-size:13.5px; margin-bottom:8px;">Q2. 核心移動情境 (Usage Scenario)</div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:8px;">
                        <button class="reset-btn ${quizState.scene==='s1'?'active':''}" style="${quizState.scene==='s1'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('scene', 's1')">🚆 雙鐵捷運接駁通勤</button>
                        <button class="reset-btn ${quizState.scene==='s2'?'active':''}" style="${quizState.scene==='s2'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('scene', 's2')">🚗 4+2 汽車後車廂出遊</button>
                        <button class="reset-btn ${quizState.scene==='s3'?'active':''}" style="${quizState.scene==='s3'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('scene', 's3')">🌳 假日河濱休閒代步</button>
                        <button class="reset-btn ${quizState.scene==='s4'?'active':''}" style="${quizState.scene==='s4'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('scene', 's4')">⛰️ 長途公路挑戰/爬坡</button>
                    </div>
                </div>

                <!-- Q3 -->
                <div>
                    <div style="font-weight:700; color:#38bdf8; font-size:13.5px; margin-bottom:8px;">Q3. 空間收折限制 (Storage Bounding)</div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:8px;">
                        <button class="reset-btn ${quizState.space==='v1'?'active':''}" style="${quizState.space==='v1'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('space', 'v1')">小套房桌底 (&lt; 100L)</button>
                        <button class="reset-btn ${quizState.space==='v2'?'active':''}" style="${quizState.space==='v2'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('space', 'v2')">一般房車後廂 (&lt; 180L)</button>
                        <button class="reset-btn ${quizState.space==='v3'?'active':''}" style="${quizState.space==='v3'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('space', 'v3')">室內車庫 (無收折限制)</button>
                    </div>
                </div>

                <!-- Q4 -->
                <div>
                    <div style="font-weight:700; color:#38bdf8; font-size:13.5px; margin-bottom:8px;">Q4. 改裝狂熱度 (Customization)</div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:8px;">
                        <button class="reset-btn ${quizState.mod==='m1'?'active':''}" style="${quizState.mod==='m1'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('mod', 'm1')">🛠️ 魔改升級 (高UCS公規)</button>
                        <button class="reset-btn ${quizState.mod==='m2'?'active':''}" style="${quizState.mod==='m2'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('mod', 'm2')">🛡️ 原廠省心 (完善保固)</button>
                    </div>
                </div>

                <!-- Q5 -->
                <div>
                    <div style="font-weight:700; color:#38bdf8; font-size:13.5px; margin-bottom:8px;">Q5. 騎士風格與特徵 (Rider Style)</div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:8px;">
                        <button class="reset-btn ${quizState.rider==='f1'?'active':''}" style="${quizState.rider==='f1'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('rider', 'f1')">🪶 嬌小身材/羽量直提 (&lt;9kg)</button>
                        <button class="reset-btn ${quizState.rider==='f2'?'active':''}" style="${quizState.rider==='f2'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('rider', 'f2')">🦾 高大壯碩/長軸高剛性</button>
                        <button class="reset-btn ${quizState.rider==='f3'?'active':''}" style="${quizState.rider==='f3'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('rider', 'f3')">🚀 競速跑格/破風輸出</button>
                        <button class="reset-btn ${quizState.rider==='f4'?'active':''}" style="${quizState.rider==='f4'?'background:#2563eb; color:#fff;':''}" onclick="setQuizAnswer('rider', 'f4')">☕ 經典文青/英倫美學</button>
                    </div>
                </div>

                <!-- Results Box -->
                <div id="quizResultOutput" style="margin-top:12px; background:#0f172a; border:1px solid #3b82f6; border-radius:8px; padding:16px;">
                    ${evaluateQuizResults()}
                </div>
            </div>
        `;
    }

    function getQuizBadge(b) {
        if (b.foldingCategory === 'nonfold') {
            return "🏁 純血剛性小徑跑車";
        }
        if (b.foldingCategory === 'trifold' || (b.foldedVolumeL > 0 && b.foldedVolumeL < 110)) {
            return "🎯 空間收折天花板";
        }
        if (b.weightKg <= 8.8) {
            return "🪶 羽量級單手直提";
        }
        if (b.scores.rigidity >= 9.0 || b.scores.sport >= 9.0) {
            return "🚀 鋼砲級無鉸鏈高剛性";
        }
        if (b.resaleRetention >= 5) {
            return "👑 二手市場硬通貨";
        }
        if (b.ucsScore >= 4.5) {
            return "🛠️ 公規改裝自由度之王";
        }
        return "⚡ 高性價比全能首選";
    }

    function evaluateQuizResults() {
        const scores = SERIES_DATA.map(b => {
            let sc = 50.0;

            // Budget match
            if (quizState.budget === 'p1' && b.medianPrice <= 15000) sc += 25;
            else if (quizState.budget === 'p2' && b.medianPrice > 15000 && b.medianPrice <= 35000) sc += 25;
            else if (quizState.budget === 'p3' && b.medianPrice > 35000 && b.medianPrice <= 70000) sc += 25;
            else if (quizState.budget === 'p4' && b.medianPrice > 70000) sc += 25;
            else sc -= 10;

            // Scene match
            if (quizState.scene === 's1') { // Commute
                sc += (b.scores.commute * 2.0);
                if (b.foldingCategory === 'trifold' || b.weightKg < 9.0) sc += 15;
            } else if (quizState.scene === 's2') { // Car
                if (b.foldingCategory !== 'nonfold' && b.foldedVolumeL < 190) sc += 18;
            } else if (quizState.scene === 's3') { // Leisure
                sc += (b.scores.commute + (10 - b.ucsScore));
            } else if (quizState.scene === 's4') { // Sport
                sc += (b.scores.sport * 2.2);
                if (b.scores.rigidity > 8.5) sc += 10;
            }

            // Space
            if (quizState.space === 'v1') {
                if (b.foldedVolumeL < 100) sc += 20;
                else sc -= 25;
            } else if (quizState.space === 'v2') {
                if (b.foldedVolumeL < 185) sc += 10;
            }

            // Mod
            if (quizState.mod === 'm1') {
                sc += (b.ucsScore * 3.5);
            } else {
                if (b.twChannelAuthority === '總代理公司貨') sc += 15;
            }

            // Rider
            if (quizState.rider === 'f1') {
                if (b.weightKg < 9.0) sc += 20;
                else if (b.weightKg > 12.0) sc -= 15;
            } else if (quizState.rider === 'f2') {
                if (b.wheelbaseMm >= 1020) sc += 15;
            } else if (quizState.rider === 'f3') {
                if (b.scores.sport >= 9.0) sc += 18;
            } else if (quizState.rider === 'f4') {
                if (b.campCode === 'classic' || b.brand === 'Brompton') sc += 20;
            }

            return { bike: b, score: sc };
        });

        scores.sort((a, b) => b.score - a.score);
        const top3 = scores.slice(0, 3);

        return `
            <div style="font-size:14px; font-weight:800; color:#38bdf8; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <span>🏆 依據您的條件推薦前 3 大命定車系平台：</span>
                <button class="hero-quick-btn" style="padding:4px 10px; font-size:11.5px;" onclick="pinTop3Quiz('${top3.map(x=>x.bike.id).join(',')}')">
                    📌 一鍵將 Top 3 加入釘選比對
                </button>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${top3.map((res, i) => `
                    <div style="background:#141b26; border:1px solid var(--border-color); border-radius:6px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:18px; font-weight:800; color:#facc15;">#${i+1}</span>
                            <div>
                                <div style="font-weight:700; color:#fff;">
                                    ${res.bike.id} ${res.bike.brand} ${res.bike.seriesName}
                                    <span style="font-size:11px; color:#34d399; margin-left:6px;">Match Score: ${Math.min(99, Math.round(res.score))}%</span>
                                </div>
                                <div style="font-size:11.5px; color:var(--text-muted);">
                                    ${getQuizBadge(res.bike)} ｜ ${res.bike.wheelSize} ｜ ${res.bike.weightKg}kg ｜ NT$ ${res.bike.medianPrice.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <button class="reset-btn" style="padding:4px 10px; font-size:11px;" onclick="closeQuizModal(); focusCard('${res.bike.id}')">
                            在型錄中查看 ↗
                        </button>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function pinTop3Quiz(idsStr) {
        const ids = idsStr.split(",");
        pinnedIds = ids.slice(0, 4);
        updatePinDock();
        closeQuizModal();
        openCompareModal();
    }

    // Shop Directory Drawer
    function initShopDrawer() {
        const bSel = document.getElementById("shopBrandFilter");
        if (!bSel) return;
        const allBrands = new Set();
        SHOPS_DATA.forEach(s => s.brands.forEach(b => allBrands.add(b)));
        bSel.innerHTML = '<option value="all">全部品牌</option>' + [...allBrands].sort().map(b => `<option value="${b}">${b}</option>`).join("");
    }

    function openShopDrawer() {
        document.getElementById("shopDrawer").classList.add("open");
        document.getElementById("shopBackdrop").classList.add("open");
        renderShopList();
    }
    function closeShopDrawer() {
        document.getElementById("shopDrawer").classList.remove("open");
        document.getElementById("shopBackdrop").classList.remove("open");
    }

    function openShopForBrand(brand) {
        openShopDrawer();
        const bSel = document.getElementById("shopBrandFilter");
        if (bSel) {
            let matched = "all";
            const shopBrandSet = new Set();
            SHOPS_DATA.forEach(s => s.brands.forEach(b => shopBrandSet.add(b)));
            const options = (bSel.options && bSel.options.length > 0) 
                ? Array.from(bSel.options).map(o => o.value).filter(v => v !== 'all') 
                : [...shopBrandSet];
            const target = (brand || "").toLowerCase();
            const exact = options.find(o => o.toLowerCase() === target);
            if (exact) {
                matched = exact;
            } else {
                const sub = options.find(o => target.includes(o.toLowerCase()) || o.toLowerCase().includes(target));
                if (sub) matched = sub;
            }
            bSel.value = matched;
            if (matched === "all") {
                showToast(`ℹ️ 名店庫聚焦於專門工坊；各大自行車行皆可對應 ${brand} 基礎保修。`);
            } else {
                showToast(`🔍 已為您篩選專精 ${matched} 之全台保養名店！`);
            }
        }
        renderShopList();
    }

    function filterShopsByRegion(region) {
        currentShopRegion = region;
        ['all', 'north', 'central', 'south'].forEach(r => {
            const btn = document.getElementById(`shopRegion-${r}`);
            if (btn) btn.classList.remove("active");
        });
        const activeMap = { 'all': 'all', '北部': 'north', '中部': 'central', '南部': 'south' };
        const activeBtn = document.getElementById(`shopRegion-${activeMap[region]}`);
        if (activeBtn) activeBtn.classList.add("active");
        renderShopList();
    }

    function renderShopList() {
        const container = document.getElementById("shopListContainer");
        if (!container) return;
        const q = (document.getElementById("shopSearchInput") ? document.getElementById("shopSearchInput").value : "").toLowerCase();
        const selectedBrand = document.getElementById("shopBrandFilter") ? document.getElementById("shopBrandFilter").value : "all";

        const filtered = SHOPS_DATA.filter(s => {
            if (currentShopRegion !== 'all' && s.region !== currentShopRegion) return false;
            if (selectedBrand !== 'all' && !s.brands.includes(selectedBrand)) return false;
            if (q) {
                const matchStr = (s.name + " " + s.area + " " + s.address + " " + s.brands.join(" ") + " " + s.skills.join(" ") + " " + s.target).toLowerCase();
                if (!matchStr.includes(q)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px 10px; color:var(--text-muted);">無符合條件的店家</div>`;
            return;
        }

        container.innerHTML = filtered.map(s => `
            <div class="shop-card">
                <div class="shop-header">
                    <div>
                        <div class="shop-name">${s.name}</div>
                        <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">📍 ${s.address} ｜ 📞 ${s.phone}</div>
                    </div>
                    <span class="shop-badge">${s.badge}</span>
                </div>
                <div class="shop-brands">
                    <span style="font-size:11px; color:#94a3b8; margin-right:4px;">專精品牌:</span>
                    ${s.brands.map(b => `<span class="shop-brand-tag" onclick="selectShopBrand('${b}')">${b}</span>`).join("")}
                </div>
                <div class="shop-skills">
                    <strong>核心技術:</strong> ${s.skills.join(" · ")}<br>
                    <small style="color:#94a3b8;">推薦客群: ${s.target}</small>
                </div>
                <div class="shop-links">
                    <a href="${s.gmap}" target="_blank" class="shop-btn">🗺️ Google 地圖導航</a>
                    <a href="tel:${s.phone.replace(/[^0-9]/g, '')}" class="shop-btn">📞 撥打電話</a>
                </div>
            </div>
        `).join("");
    }

    function selectShopBrand(brand) {
        closeShopDrawer();
        document.getElementById("searchInput").value = brand;
        applyFilters();
    }
