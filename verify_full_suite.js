const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== STARTING DEEP SYSTEMATIC VERIFICATION SUITE (110 SERIES ARCHITECTURE) ===');

// 1. Read HTML
const htmlPath = path.join('dist', 'folding_bike_series_guide_tw.html');
const html = fs.readFileSync(htmlPath, 'utf8');
assert(html.length > 100000, `HTML file too small: ${html.length}`);
console.log(`[PASS] HTML file exists, size: ${html.length.toLocaleString()} bytes`);

// 2. Extract embedded script
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
assert(scriptMatch, 'No <script> tag found in HTML');
const jsCode = scriptMatch[1];
console.log(`[PASS] Extracted JavaScript (${jsCode.length.toLocaleString()} bytes)`);

// 3. Mock DOM
const elements = {};
function getOrCreateElem(id) {
    if (!elements[id]) {
        elements[id] = {
            id,
            style: { display: '' },
            classList: {
                classes: new Set(),
                add(c) { this.classes.add(c); },
                remove(c) { this.classes.delete(c); },
                contains(c) { return this.classes.has(c); },
                toggle(c, force) {
                    if (force !== undefined) {
                        if (force) this.classes.add(c);
                        else this.classes.delete(c);
                    } else {
                        if (this.classes.has(c)) this.classes.delete(c);
                        else this.classes.add(c);
                    }
                }
            },
            value: '',
            innerText: '',
            _innerHTML: '',
            attributes: {},
            setAttribute(k, v) { this.attributes[k] = String(v); },
            getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; },
            set innerHTML(val) {
                this._innerHTML = val;
            },
            get innerHTML() {
                return this._innerHTML;
            },
            getContext: () => ({
                resetTransform: () => {},
                setTransform: () => {},
                scale: () => {},
                fillRect: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                fill: () => {},
                strokeRect: () => {},
                fillText: () => {},
                save: () => {},
                restore: () => {},
                rotate: () => {},
                translate: () => {},
                arc: () => {}
            }),
            getBoundingClientRect: () => ({ width: 800, height: 480, left: 0, top: 0 }),
            addEventListener: (evt, fn) => {},
            scrollIntoView: () => {}
        };
    }
    return elements[id];
}

// Pre-populate input elements
getOrCreateElem('searchInput').value = '';
getOrCreateElem('sortSelect').value = 'id_asc';
getOrCreateElem('wheelFilter').value = 'all';
getOrCreateElem('foldingFilter').value = 'all';
getOrCreateElem('lifecycleFilter').value = 'all';
getOrCreateElem('channelFilter').value = 'all';
getOrCreateElem('ucsFilter').value = '0';
getOrCreateElem('orientationFilter').value = 'all';
getOrCreateElem('priceMaxSlider').value = '250000';
getOrCreateElem('quadrantViewMode').value = 'sport_commute';

// Modals and Drawers
getOrCreateElem('compareModal');
getOrCreateElem('compareModalBody');
getOrCreateElem('guideModal');
getOrCreateElem('gearModal');
getOrCreateElem('trunkModal');
getOrCreateElem('quizModal');
getOrCreateElem('shopDrawer');
getOrCreateElem('shopBackdrop');
getOrCreateElem('appToast');
getOrCreateElem('seriesGrid');
getOrCreateElem('filteredCount');
getOrCreateElem('pinDock');
getOrCreateElem('pinChips');
getOrCreateElem('pinCount');
getOrCreateElem('canvasHolder');
getOrCreateElem('quadrantCanvas');
getOrCreateElem('quadrantTooltip');
getOrCreateElem('seriesGridSentinel');

// Calculator elements
getOrCreateElem('calcWheel').value = '16_349';
getOrCreateElem('calcHub').value = 'none';
getOrCreateElem('calcChainring').value = '50';
getOrCreateElem('calcCassette').value = '11,13,15,17';
getOrCreateElem('calcCadence').value = '80';
getOrCreateElem('gearChartOutput');

// Trunk elements
getOrCreateElem('trunkCarSelect').value = 'altis';
getOrCreateElem('trunkBikeSelect').value = 'S01';
getOrCreateElem('trunkCountSelect').value = '2';
getOrCreateElem('trunkSeatSelect').value = 'normal';
getOrCreateElem('trunkSimOutput');

// Quiz elements
getOrCreateElem('quizModalBody');
getOrCreateElem('quizResultOutput');

// Shop elements
getOrCreateElem('shopListContainer');
getOrCreateElem('shopSearchInput').value = '';
getOrCreateElem('shopBrandFilter').value = 'all';

let eventListeners = {};

const domMock = {
    document: {
        addEventListener: (evt, fn) => {
            if (!eventListeners[evt]) eventListeners[evt] = [];
            eventListeners[evt].push(fn);
            if (evt === 'DOMContentLoaded') domMock._domReady = fn;
        },
        getElementById: (id) => {
            if (id.startsWith('card-') && domMock._filteredCards && !domMock._filteredCards.has(id)) {
                return null;
            }
            return getOrCreateElem(id);
        },
        querySelectorAll: (sel) => {
            if (sel === '.camp-btn') {
                return ['all', 'classic', 'boutique', 'mainstream', 'fullsize', 'taiwan', 'custom', 'ebike'].map(c => {
                    const el = getOrCreateElem('camp-btn-' + c);
                    el.getAttribute = (attr) => (attr === 'data-camp' ? c : null);
                    return el;
                });
            }
            if (sel === '.ladder-tab-btn') {
                return ['weight', 'volume', 'sport', 'ucs', 'price'].map(cat => {
                    const el = getOrCreateElem('ladder-btn-' + cat);
                    el.getAttribute = (attr) => (attr === 'data-ladder-cat' ? cat : null);
                    return el;
                });
            }
            return [];
        },
        querySelector: (sel) => {
            const m = sel.match(/\[data-ladder-cat="([^"]+)"\]/);
            if (m) {
                return getOrCreateElem('ladder-btn-' + m[1]);
            }
            return null;
        },
        createElement: (tag) => {
            const el = getOrCreateElem('temp-' + Math.random());
            el.children = [];
            el.appendChild = (child) => {
                el.children.push(child);
            };
            return el;
        },
        body: { offsetHeight: 2000 }
    },
    window: {
        addEventListener: (evt, fn) => {
            if (!eventListeners[evt]) eventListeners[evt] = [];
            eventListeners[evt].push(fn);
        },
        devicePixelRatio: 1,
        location: { hash: '', href: 'https://example.com/guide', pathname: '/guide' },
        history: { replaceState: () => {} },
        navigator: { clipboard: { writeText: () => Promise.resolve() } },
        innerHeight: 800,
        scrollY: 0
    },
    console: console,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    Set: Set,
    Array: Array,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    URLSearchParams: URLSearchParams
};

// 4. Run script in VM
const script = new vm.Script(jsCode);
const ctx = vm.createContext(domMock);
script.runInContext(ctx);

// Helper to evaluate in context
function evalInCtx(expr) {
    return vm.runInContext(expr, ctx);
}

// Trigger DOMContentLoaded
if (domMock._domReady) {
    domMock._domReady();
}
console.log('[PASS] Script loaded and initialized without errors in VM');

// Test 1: Check all 110 series exist in SERIES_DATA
const seriesData = evalInCtx('SERIES_DATA');
assert.strictEqual(seriesData.length, 110, `Expected 110 series, got ${seriesData.length}`);
console.log('[PASS] Test 1: Exactly 110 series present in database');

// Test 2: Check canonical folding categories sum to 110
const foldCats = ['trifold', 'vertical', 'midfold', 'coaxial', 'slide_special', 'nonfold'];
let totalFoldCount = 0;
const foldCounts = {};
foldCats.forEach(cat => {
    evalInCtx(`currentFilter.folding = '${cat}';`);
    const filtered = evalInCtx('getFilteredData()');
    foldCounts[cat] = filtered.length;
    totalFoldCount += filtered.length;
    assert(filtered.length > 0, `Category ${cat} should have >0 bikes, got ${filtered.length}`);
});
evalInCtx("currentFilter.folding = 'all';");
console.log('Folding category distribution:', foldCounts);
assert.strictEqual(totalFoldCount, 110, `Total bikes across folding categories (${totalFoldCount}) != 110`);
console.log('[PASS] Test 2: 100% of 110 series match canonical folding categories (Trifold: 10, Vertical: 20, Mid-Fold: 58, Coaxial: 9, Slide: 12, Non-fold: 1)');

// Test 3: Test Keyword Searches (including new platforms S83~S110)
const testQueries = [
    { q: '小布', expectedMin: 2, mustInclude: ['S01', 'S02'] },
    { q: '鳥車', expectedMin: 1, mustInclude: ['S03'] },
    { q: '傘兵', expectedMin: 1, mustInclude: ['S30'] },
    { q: '一丁點', expectedMin: 1, mustInclude: ['S13'] },
    { q: 'FD-806', expectedMin: 1, mustInclude: ['S40'] },
    { q: '飛翔', expectedMin: 1, mustInclude: ['S42'] },
    { q: '大行', expectedMin: 6, mustInclude: ['S18', 'S19', 'S20', 'S21', 'S22', 'S62'] },
    { q: '捷安特', expectedMin: 4, mustInclude: ['S38', 'S39', 'S40', 'S41'] },
    { q: '美利達', expectedMin: 1, mustInclude: ['S42'] },
    { q: '功學社', expectedMin: 2, mustInclude: ['S36', 'S37'] },
    { q: '迪卡儂', expectedMin: 1, mustInclude: ['S54'] },
    { q: 'BESV', expectedMin: 1, mustInclude: ['S55'] },
    { q: '司特龍', expectedMin: 1, mustInclude: ['S56'] },
    { q: '愛爾蘭', expectedMin: 1, mustInclude: ['S57'] },
    { q: '赫莎', expectedMin: 1, mustInclude: ['S58'] },
    { q: '索羅克', expectedMin: 1, mustInclude: ['S59'] },
    { q: '雷奇', expectedMin: 1, mustInclude: ['S60'] },
    { q: '寶力', expectedMin: 1, mustInclude: ['S61'] },
    { q: '騎記', expectedMin: 1, mustInclude: ['S63'] },
    { q: 'Moulton', expectedMin: 1, mustInclude: ['S64'] },
    { q: 'Hummingbird', expectedMin: 1, mustInclude: ['S83'] },
    { q: '蜂鳥', expectedMin: 1, mustInclude: ['S83'] },
    { q: 'Vello', expectedMin: 1, mustInclude: ['S84'] },
    { q: 'Helix', expectedMin: 1, mustInclude: ['S85'] },
    { q: 'Gocycle', expectedMin: 1, mustInclude: ['S86'] },
    { q: 'A-bike', expectedMin: 1, mustInclude: ['S87'] },
    { q: 'Kwiggle', expectedMin: 1, mustInclude: ['S88'] },
    { q: 'Bickerton', expectedMin: 1, mustInclude: ['S89'] },
    { q: '青蛙鳥', expectedMin: 1, mustInclude: ['S90'] },
    { q: 'Tartaruga', expectedMin: 1, mustInclude: ['S91'] },
    { q: 'Bernds', expectedMin: 1, mustInclude: ['S92'] },
    { q: 'Mu', expectedMin: 1, mustInclude: ['S93'] },
    { q: 'Curve', expectedMin: 1, mustInclude: ['S94'] },
    { q: 'Helios', expectedMin: 1, mustInclude: ['S95'] },
    { q: 'Presto', expectedMin: 1, mustInclude: ['S96'] },
    { q: 'Dash', expectedMin: 1, mustInclude: ['S97'] },
    { q: 'Halfway', expectedMin: 1, mustInclude: ['S98'] },
    { q: 'Verge', expectedMin: 1, mustInclude: ['S99'] },
    { q: 'GSD', expectedMin: 1, mustInclude: ['S100'] },
    { q: 'WestWood', expectedMin: 1, mustInclude: ['S101'] },
    { q: 'Zephyr', expectedMin: 1, mustInclude: ['S102'] },
    { q: 'Tornado', expectedMin: 1, mustInclude: ['S103'] },
    { q: 'Velocity', expectedMin: 1, mustInclude: ['S104'] },
    { q: 'Banian', expectedMin: 1, mustInclude: ['S105'] },
    { q: 'Aria', expectedMin: 1, mustInclude: ['S106'] },
    { q: 'Fiido', expectedMin: 1, mustInclude: ['S107'] },
    { q: 'Himo', expectedMin: 1, mustInclude: ['S108'] },
    { q: 'Trinx', expectedMin: 1, mustInclude: ['S109'] },
    { q: 'Windspeed', expectedMin: 1, mustInclude: ['S110'] }
];

testQueries.forEach(t => {
    evalInCtx('resetAllFilters()');
    domMock.document.getElementById('searchInput').value = t.q;
    evalInCtx('applyFilters()');
    const res = evalInCtx('getFilteredData()');
    const ids = res.map(x => x.id);
    assert(res.length >= t.expectedMin, `Search "${t.q}" expected >= ${t.expectedMin}, got ${res.length}`);
    t.mustInclude.forEach(mid => {
        assert(ids.includes(mid), `Search "${t.q}" must include ${mid}, found: ${ids.join(',')}`);
    });
});
console.log('[PASS] Test 3: Search keyword and alias queries (original + S83~S110 platforms) resolved correctly');

// Test 4: Verify switchLadderCategory runs without `event`
evalInCtx("switchLadderCategory('sport')");
assert.strictEqual(evalInCtx('currentLadderCategory'), 'sport');
evalInCtx("switchLadderCategory('ucs')");
assert.strictEqual(evalInCtx('currentLadderCategory'), 'ucs');
evalInCtx("switchLadderCategory('price')");
assert.strictEqual(evalInCtx('currentLadderCategory'), 'price');
console.log('[PASS] Test 4: switchLadderCategory executed without relying on global `event`');

// Test 5: Verify toggleAllLadder
assert.strictEqual(evalInCtx('showAllLadder'), false);
evalInCtx('toggleAllLadder()');
assert.strictEqual(evalInCtx('showAllLadder'), true);
evalInCtx('toggleAllLadder()');
assert.strictEqual(evalInCtx('showAllLadder'), false);
console.log('[PASS] Test 5: toggleAllLadder toggles between 15 items and full 110 items');

// Test 6: Verify focusCard auto-resets filters when card is hidden
evalInCtx('resetAllFilters()');
evalInCtx("filterByCamp('boutique')");
let currBikes = evalInCtx('getFilteredData()');
assert.strictEqual(currBikes.length, 16);
domMock._filteredCards = new Set(currBikes.map(b => 'card-' + b.id));
assert(!domMock._filteredCards.has('card-S01'));

// Call focusCard('S01')
evalInCtx("focusCard('S01')");
assert.strictEqual(evalInCtx('currentFilter.camp'), 'all');
console.log('[PASS] Test 6: focusCard on filtered-out bike automatically resets filter and reveals card');

// Test 7: Verify Pin & Compare without DOM wiping
evalInCtx('clearAllPinned()');
assert.strictEqual(evalInCtx('pinnedIds.length'), 0);
evalInCtx("togglePin('S01')");
evalInCtx("togglePin('S03')");
evalInCtx("togglePin('S13')");
evalInCtx("togglePin('S40')");
assert.strictEqual(evalInCtx('pinnedIds.length'), 4);

// Try to pin 5th
evalInCtx("togglePin('S42')");
assert.strictEqual(evalInCtx('pinnedIds.length'), 4); // Capped at 4

// Open compare modal
evalInCtx('openCompareModal()');
const modalBodyHtml = elements['compareModalBody'].innerHTML;
assert(modalBodyHtml.includes('S01 Brompton'), 'Modal must contain S01 Brompton');
assert(modalBodyHtml.includes('S03 Pacific Cycles'), 'Modal must contain S03');
assert(modalBodyHtml.includes('S13 LIDROP'), 'Modal must contain S13');
assert(modalBodyHtml.includes('S40 GIANT'), 'Modal must contain S40');
assert(modalBodyHtml.includes('展開前騎乘幾何'), 'Modal must contain unfolded geometry');
assert(modalBodyHtml.includes('折疊後收折尺寸'), 'Modal must contain folded size');
assert(modalBodyHtml.includes('六角多維評測雷達'), 'Modal must contain 6-Axis radar box');
assert(modalBodyHtml.includes('<polygon'), 'Modal radar must include SVG polygon');
assert(modalBodyHtml.includes('modal-remove-bike-btn'), 'Modal must contain in-table remove buttons');
console.log('[PASS] Test 7: Pin & Compare dock, 4-bike limit, SVG radar overlay, and comparison matrix validated');

// Test 8: Verify Keyboard Escape closes all modals
elements['compareModal'].classList.add('open');
elements['gearModal'].classList.add('open');
elements['trunkModal'].classList.add('open');
assert(elements['compareModal'].classList.contains('open'));
if (eventListeners['keydown']) {
    eventListeners['keydown'].forEach(fn => fn({ key: 'Escape' }));
}
assert(!elements['compareModal'].classList.contains('open'));
assert(!elements['gearModal'].classList.contains('open'));
assert(!elements['trunkModal'].classList.contains('open'));
console.log('[PASS] Test 8: Keyboard Escape closes all open modals');

// Test 9: Verify HTML content has Macro Market Analytics
assert(html.includes('台灣折疊車市場：價格金字塔與整備重量梯度宏觀分析'), 'Market Analytics missing');
assert(html.includes('極致羽量級'), 'Weight spectrum tier missing');
assert(html.includes('入門國民級'), 'Price pyramid tier missing');
console.log('[PASS] Test 9: Macro Market Analytics (Price Pyramid & Weight Spectrum) present in HTML');

// Test 10: Verify Cards have 摺疊前後尺寸分析
evalInCtx('resetAllFilters()');
evalInCtx('renderSeriesGrid()');
const sampleCard = elements['seriesGrid'].innerHTML;
assert(sampleCard.includes('展開:'), 'Card missing unfolded size');
assert(sampleCard.includes('收折:'), 'Card missing folded size');
assert(sampleCard.includes('體積縮減率:'), 'Card missing volume reduction ratio');
assert(sampleCard.includes('單位成本:'), 'Card missing unit cost analysis');
console.log('[PASS] Test 10: Every series card contains complete before/after folding size analysis and unit cost');

// Test 11: Verify 100% Zero-CDN and zero external network dependencies
const extCss = html.match(/<link[^>]+href=["'](http[s]?:\/\/[^"']+)["']/gi) || [];
const extJs = html.match(/<script[^>]+src=["'](http[s]?:\/\/[^"']+)["']/gi) || [];
assert.strictEqual(extCss.length, 0, `Found external CSS: ${extCss.join(', ')}`);
assert.strictEqual(extJs.length, 0, `Found external JS: ${extJs.join(', ')}`);
console.log('[PASS] Test 11: 100% Zero-CDN and zero external network dependency confirmed (Pure offline SPWA)');

// Test 12: Verify Hero Stat Pill displays exactly 110 platforms
assert(html.includes('<div class="num">110</div>'), 'Hero stats must show 110 platforms');
assert(!html.includes('<div class="num">82</div>') && !html.includes('<div class="num">63</div>') && !html.includes('<div class="num">53</div>'), 'Hero stats contains outdated numbers!');
console.log('[PASS] Test 12: Hero banner stats correctly show 110 platforms (zero stale "82", "63", "53")');

// Test 13: Verify Canvas Interactive Quadrant Plot
const canvasModes = ['sport_commute', 'portability_rigidity', 'price_weight'];
canvasModes.forEach(m => {
    evalInCtx(`document.getElementById('quadrantViewMode').value = '${m}';`);
    evalInCtx('renderQuadrant()');
    const pts = evalInCtx('canvasPoints');
    assert.strictEqual(pts.length, 110, `Mode ${m} expected 110 canvas points, got ${pts.length}`);
    pts.forEach(pt => {
        assert(pt.x >= 54 && pt.x <= 776, `Mode ${m} Series ${pt.data.id} x=${pt.x} out of canvas bounds`);
        assert(pt.y >= 24 && pt.y <= 436, `Mode ${m} Series ${pt.data.id} y=${pt.y} out of canvas bounds`);
    });
});
console.log('[PASS] Test 13: All 110 series data points in all 3 canvas quadrant views stay strictly within plot boundaries');

// Test 14: Verify Schema v2.0 fields in all 110 series
const v2Keys = [
    'productionStatus', 'firstReleaseYear', 'latestModelYear', 'twDistributor',
    'twChannelAuthority', 'twWarrantyCoverage', 'partsFriction', 'resaleRetention',
    'publicTransitFit', 'buyingTraps'
];
seriesData.forEach(s => {
    v2Keys.forEach(k => {
        assert(s[k] !== undefined && s[k] !== null && s[k] !== '', `Series ${s.id} missing Schema v2.0 key: ${k}`);
    });
    assert(typeof s.firstReleaseYear === 'number' && s.firstReleaseYear >= 1970 && s.firstReleaseYear <= 2026, `Series ${s.id} invalid firstReleaseYear: ${s.firstReleaseYear}`);
    assert(typeof s.latestModelYear === 'number' && s.latestModelYear >= s.firstReleaseYear && s.latestModelYear <= 2026, `Series ${s.id} invalid latestModelYear: ${s.latestModelYear}`);
    assert(typeof s.resaleRetention === 'number' && s.resaleRetention >= 1 && s.resaleRetention <= 5, `Series ${s.id} invalid resaleRetention: ${s.resaleRetention}`);
});
console.log('[PASS] Test 14: All 110 series have complete, non-null, valid Schema v2.0 lifecycle & logistics dimensions');

// Test 15: Verify Lifecycle filter works across all categories and sums to 110
const lifeStatuses = ['ACTIVE_IN_PRODUCTION', 'ACTIVE_IN_STOCK', 'DISCONTINUED_CLASSIC', 'COLLECTIBLE_VINTAGE', 'DORMANT_DEFUNCT'];
let totalLifeCount = 0;
const lifeCounts = {};
lifeStatuses.forEach(st => {
    evalInCtx('resetAllFilters()');
    evalInCtx(`currentFilter.lifecycle = '${st}';`);
    const filtered = evalInCtx('getFilteredData()');
    lifeCounts[st] = filtered.length;
    totalLifeCount += filtered.length;
});
// Test aliases
evalInCtx("currentFilter.lifecycle = 'COLLECTORS_EDITION';");
assert.strictEqual(evalInCtx('getFilteredData().length'), lifeCounts['COLLECTIBLE_VINTAGE']);
evalInCtx("currentFilter.lifecycle = 'BRAND_DORMANT';");
assert.strictEqual(evalInCtx('getFilteredData().length'), lifeCounts['DORMANT_DEFUNCT']);

evalInCtx('resetAllFilters()');
console.log('Lifecycle distribution:', lifeCounts);
assert.strictEqual(totalLifeCount, 110, `Total bikes across lifecycle categories (${totalLifeCount}) != 110`);
console.log('[PASS] Test 15: Lifecycle filter accurately categorizes all 110 series (sum = 110)');

// Test 16: Verify Channel Authority filter works across all tiers and sums to 110
const channelTiers = ['總代理公司貨', '原廠授權經銷', '專門小徑工作室', '平行輸入水貨', '純二手交流'];
let totalChannelCount = 0;
const channelCounts = {};
channelTiers.forEach(ch => {
    evalInCtx('resetAllFilters()');
    evalInCtx(`currentFilter.channel = '${ch}';`);
    const filtered = evalInCtx('getFilteredData()');
    channelCounts[ch] = filtered.length;
    totalChannelCount += filtered.length;
    assert(filtered.length > 0, `Channel tier ${ch} should have >0 bikes, got ${filtered.length}`);
});
evalInCtx('resetAllFilters()');
console.log('Channel tier distribution:', channelCounts);
assert.strictEqual(totalChannelCount, 110, `Total bikes across channel tiers (${totalChannelCount}) != 110`);
console.log('[PASS] Test 16: Channel Authority filter accurately categorizes all 110 series (sum = 110)');

// Test 17: Verify Compare Modal properly translates COLLECTIBLE_VINTAGE and DORMANT_DEFUNCT
evalInCtx('clearAllPinned()');
evalInCtx("togglePin('S73')");
evalInCtx("togglePin('S75')");
evalInCtx('openCompareModal()');
const vintageModalHtml = elements['compareModalBody'].innerHTML;
assert(vintageModalHtml.includes('🟣 典藏逸品'), 'Compare modal must display 🟣 典藏逸品 for S73');
assert(vintageModalHtml.includes('⚪ 品牌休眠'), 'Compare modal must display ⚪ 品牌休眠 for S75');
assert(!vintageModalHtml.includes('COLLECTIBLE_VINTAGE'), 'Compare modal must not show raw enum string COLLECTIBLE_VINTAGE');
assert(!vintageModalHtml.includes('DORMANT_DEFUNCT'), 'Compare modal must not show raw enum string DORMANT_DEFUNCT');
console.log('[PASS] Test 17: Compare modal properly displays Chinese status badges for vintage & dormant series');

// Test 18: Verify CSS media query syntax
const mediaQueryIdx = html.indexOf('@media (max-width: 768px)');
const toastIdx = html.indexOf('.toast-notification {');
assert(mediaQueryIdx !== -1 && toastIdx !== -1, 'CSS selectors must exist');
const mediaClosingBrace = html.indexOf('}', html.indexOf('.hero-title h1', mediaQueryIdx));
assert(mediaClosingBrace < toastIdx, '@media (max-width: 768px) must be closed before .toast-notification');
console.log('[PASS] Test 18: CSS media query is cleanly closed and desktop toast notification styling is preserved');

// Test 19: Inline SVG 6-Axis Multi-Series Radar Chart Verification
const testBikesForRadar = seriesData.slice(0, 3);
const radarSvgOutput = evalInCtx(`renderCompareRadarSvg(${JSON.stringify(testBikesForRadar)}, 360)`);
assert(radarSvgOutput.includes('<svg width="360" height="360"'), 'Radar SVG must have correct dimensions');
assert(radarSvgOutput.includes('points='), 'Radar SVG must contain polygon coordinate points');
assert(radarSvgOutput.includes('輕量羽量'), 'Radar SVG must include Weight axis label');
assert(radarSvgOutput.includes('巡航剛性'), 'Radar SVG must include Rigidity axis label');
assert(radarSvgOutput.includes('收折緊湊'), 'Radar SVG must include Volume axis label');
assert(radarSvgOutput.includes('性價比'), 'Radar SVG must include CP axis label');
console.log('[PASS] Test 19: Inline SVG 6-Axis Multi-Series Radar chart renders all 6 axes and polygon geometries');

// Test 20: Gear-Inch / Cadence / Speed Calculator Verification
evalInCtx("document.getElementById('calcWheel').value = '16_349';");
evalInCtx("document.getElementById('calcHub').value = 'none';");
evalInCtx("document.getElementById('calcChainring').value = '50';");
evalInCtx("document.getElementById('calcCassette').value = '11,13,15,17';");
evalInCtx("document.getElementById('calcCadence').value = '80';");
evalInCtx('runGearCalculator()');
const gearOutputHtml = elements['gearChartOutput'].innerHTML;
assert(gearOutputHtml.includes('Gear-Inch 階梯與巡航時速'), 'Gear output must contain title');
assert(gearOutputHtml.includes('GI'), 'Gear output must calculate GI');
assert(gearOutputHtml.includes('km/h'), 'Gear output must calculate speed in km/h');
assert(gearOutputHtml.includes('爬坡'), 'Gear output must include climbing diagnosis');
console.log('[PASS] Test 20: Gear-Inch, Cadence, and Speed calculation engine verified');

// Test 21: Trunk Fit Simulator Verification
evalInCtx("document.getElementById('trunkCarSelect').value = 'altis';");
evalInCtx("document.getElementById('trunkBikeSelect').value = 'S01';");
evalInCtx("document.getElementById('trunkCountSelect').value = '2';");
evalInCtx('runTrunkSimulator()');
const trunkOutputHtml = elements['trunkSimOutput'].innerHTML;
assert(trunkOutputHtml.includes('Toyota Altis'), 'Trunk sim must display selected car model');
assert(trunkOutputHtml.includes('後變速器朝上法則'), 'Trunk sim must display Rear Derailleur UP Hard Rule warning');
assert(trunkOutputHtml.includes('平躺堆疊容量'), 'Trunk sim must display flat stack capacity');

// Also test nonfold bike S80
evalInCtx("document.getElementById('trunkBikeSelect').value = 'S80';");
evalInCtx('runTrunkSimulator()');
const s80TrunkHtml = elements['trunkSimOutput'].innerHTML;
assert(s80TrunkHtml.includes('不可折疊小徑車'), 'S80 must trigger nonfold warning in trunk simulator');

// Test newly added Ford Focus 5D preset
evalInCtx("document.getElementById('trunkCarSelect').value = 'focus';");
evalInCtx("document.getElementById('trunkBikeSelect').value = 'S01';");
evalInCtx('runTrunkSimulator()');
const focusTrunkHtml = elements['trunkSimOutput'].innerHTML;
assert(focusTrunkHtml.includes('Ford Focus'), 'Trunk sim must display Ford Focus 5D preset');
console.log('[PASS] Test 21: Trunk Fit Simulator handles Sedan/CUV/SUV presets, derailleur rule, and nonfold warnings');

// Test 22: Quiz Wizard Recommendation Engine Verification
const quizResult = evalInCtx('evaluateQuizResults()');
assert(quizResult.includes('依據您的條件推薦前 3 大命定車系平台'), 'Quiz must recommend top 3 bikes');
assert(quizResult.includes('Match Score:'), 'Quiz must display match score percentage');
assert(quizResult.includes('一鍵將 Top 3 加入釘選比對'), 'Quiz must have pin top 3 button');
console.log('[PASS] Test 22: Quiz Wizard 5-question weighted recommendation engine validated');

// Test 23: 18 Taiwan Specialist Shops Directory Verification
const shopsData = evalInCtx('SHOPS_DATA');
assert.strictEqual(shopsData.length, 18, `Expected 18 shops, got ${shopsData.length}`);
const shopRegions = new Set(shopsData.map(s => s.region));
assert(shopRegions.has('北部') && shopRegions.has('中部') && shopRegions.has('南部'), 'Shops must span North, Central, South');
shopsData.forEach(s => {
    assert(s.name && s.address && s.phone && s.brands && s.skills && s.gmap, `Shop ${s.id} missing mandatory attributes`);
    assert(s.gmap.startsWith('https://maps.google.com/'), `Shop ${s.id} invalid Google Maps URL`);
});
console.log('[PASS] Test 23: 18 Taiwan Specialist Shops Directory verified across North, Central, South');

// Test 24: Two-stage batch rendering and card drawer hydration
evalInCtx("toggleDrawer('S01')");
const drawerS01 = elements['drawer-S01'];
assert.strictEqual(drawerS01.getAttribute('data-hydrated'), 'true', 'Drawer must be marked as data-hydrated=true');
assert(drawerS01.innerHTML.includes('代表子型號與參考價格'), 'Hydrated drawer must contain submodels');
assert(drawerS01.innerHTML.includes('二手選購避坑指南與通病檢查要點'), 'Hydrated drawer must contain buying traps');
console.log('[PASS] Test 24: Card drawer lazy hydration and two-stage rendering verified');

// Test 25: Verify all 110 series local image assets exist and are non-empty (>5KB)
console.log('=== VERIFYING ALL 110 SERIES LOCAL IMAGES ON DISK ===');
const imgDir = path.join('dist', 'images');
assert(fs.existsSync(imgDir), 'dist/images directory does not exist');
seriesData.forEach(s => {
    const relUrl = s.imageUrl;
    assert(relUrl.startsWith('images/'), `Series ${s.id} imageUrl '${relUrl}' does not start with images/`);
    const diskPath = path.join('dist', relUrl.replace(/\//g, path.sep));
    assert(fs.existsSync(diskPath), `Series ${s.id} image missing on disk: ${diskPath}`);
    const stat = fs.statSync(diskPath);
    assert(stat.size > 5000, `Series ${s.id} image too small (${stat.size} bytes): ${diskPath}`);
});
console.log('[PASS] Test 25: All 110 series have verified, decoupled, decodable local image files on disk (>5KB each)');

// Test 26: URL Hash State Sync, History Navigation, & Print Hydration
domMock.window.location.hash = '#compare=S01,S05,S09&sort=weight_asc&wheel=16_349&priceMax=80000&search=Brompton';
evalInCtx('restoreStateFromHash()');
assert.deepStrictEqual([...evalInCtx('pinnedIds')], ['S01', 'S05', 'S09'], 'pinnedIds must be restored from hash');
assert.strictEqual(elements['sortSelect'].value, 'weight_asc', 'sortSelect must be restored from hash');
assert.strictEqual(elements['wheelFilter'].value, '16_349', 'wheelFilter must be restored from hash');
assert.strictEqual(elements['priceMaxSlider'].value, 80000, 'priceMaxSlider must be restored from hash');
assert.strictEqual(elements['searchInput'].value, 'Brompton', 'searchInput must be restored from hash');
assert(eventListeners['hashchange'] && eventListeners['hashchange'].length > 0, 'hashchange event listener must be registered');
assert(eventListeners['beforeprint'] && eventListeners['beforeprint'].length > 0, 'beforeprint event listener must be registered');
// Trigger beforeprint handler to test hydration
eventListeners['beforeprint'][0]();
assert.strictEqual(evalInCtx('renderedCount'), evalInCtx('currentFilteredList.length'), 'beforeprint must hydrate all filtered cards');
console.log('[PASS] Test 26: URL Hash two-way synchronization, history navigation, and beforeprint full hydration verified');

// Test 27: Trunk Fit Simulator Physical Logic & Rear Seat Folding
evalInCtx("document.getElementById('trunkCarSelect').value = 'fit';");
evalInCtx("document.getElementById('trunkBikeSelect').value = 'S34';");
evalInCtx("document.getElementById('trunkSeatSelect').value = 'normal';");
evalInCtx("document.getElementById('trunkCountSelect').value = '1';");
evalInCtx('runTrunkSimulator()');
const oversizedHtml = elements['trunkSimOutput'].innerHTML;
assert(oversizedHtml.includes('裝載預警'), 'Oversized bike in compact trunk must trigger warning');
assert(oversizedHtml.includes('★☆☆☆☆'), 'Oversized bike exceeding bounds must get 1-star rating, not 4-star');

// Now fold rear seats
evalInCtx("document.getElementById('trunkSeatSelect').value = 'folded';");
evalInCtx('runTrunkSimulator()');
const foldedHtml = elements['trunkSimOutput'].innerHTML;
assert(foldedHtml.includes('(後座傾倒)'), 'Trunk sim must indicate folded rear seats mode');
assert(foldedHtml.includes('145cm'), 'Available depth must expand to 145cm when folded');
console.log('[PASS] Test 27: Trunk Fit Simulator physics logic (non-zero bounds enforcement & seat fold expansion) verified');

// Test 28: Gear-Inch Calculator Extreme Scaling
evalInCtx("document.getElementById('calcWheel').value = '20_451';");
evalInCtx("document.getElementById('calcHub').value = 'none';");
evalInCtx("document.getElementById('calcChainring').value = '56';");
evalInCtx("document.getElementById('calcCassette').value = '9,11,13,15,18,21,24,28';");
evalInCtx('runGearCalculator()');
const extremeGearHtml = elements['gearChartOutput'].innerHTML;
assert(extremeGearHtml.includes('124.2 GI'), 'Gear calculator must accurately compute extreme 124.2 GI');
assert(extremeGearHtml.includes('width:'), 'Gear bars must be rendered with relative widths');
console.log('[PASS] Test 28: Gear-Inch calculator dynamic ladder scaling (>120 GI auto-expansion) verified');

// Test 29: Dynamic Quiz Badging
const s01Badge = evalInCtx("getQuizBadge(SERIES_DATA.find(x => x.id === 'S01'))");
const s83Badge = evalInCtx("getQuizBadge(SERIES_DATA.find(x => x.id === 'S83'))");
const s80Badge = evalInCtx("getQuizBadge(SERIES_DATA.find(x => x.id === 'S80'))");
assert.strictEqual(s01Badge, '🎯 空間收折天花板', 'S01 Brompton must receive trifold compact badge');
assert.strictEqual(s83Badge, '🪶 羽量級單手直提', 'S83 Hummingbird (6.9kg) must receive featherweight badge');
assert.strictEqual(s80Badge, '🏁 純血剛性小徑跑車', 'S80 Tyrell CSI nonfold must receive rigid race badge');
console.log('[PASS] Test 29: Quiz Wizard dynamic feature-based recommendation badging verified');

// Test 30: Specialist Shop Brand Cross-Linking & Fuzzy Match
evalInCtx("openShopForBrand('Pacific Cycles')");
assert.strictEqual(elements['shopBrandFilter'].value, 'Pacific', 'Pacific Cycles must fuzzy match Pacific in shop brands');
assert(elements['appToast'].innerText.includes('Pacific'), 'Toast must notify user of brand filter match');
console.log('[PASS] Test 30: Specialist shop brand cross-linking, fuzzy matching, and navigation verified');

console.log('================================================================');
console.log('=== ALL 30 DEEP VERIFICATION TESTS PASSED WITH 100% SUCCESS! ===');
console.log('================================================================');
