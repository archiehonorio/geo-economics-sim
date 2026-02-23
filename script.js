/* ══════════════════════════════════════════════════════════
   GEO-ECONOMICS SIMULATOR  ·  script.js
   All game logic: state, loop, rendering, events, win/lose.
   Fully commented for beginners.
══════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────
// 1. GAME CONSTANTS
//    Fixed values that define how the simulation works.
// ─────────────────────────────────────────────────────────
const CONSTANTS = {
  START_YEAR: 2025,
  MAX_SCORE_WIN: 85,         // Win threshold
  UNEMP_LOSE: 25,            // Unemployment % that triggers loss
  DEBT_LOSE: 150,            // Debt % of GDP that triggers loss
  NEG_GDP_LOSE: 3,           // Consecutive negative GDP years

  // Each industry's base GDP output (₱ Billion) per 1M workers
  // and a base employment share (% of labor force)
  INDUSTRIES: [
    { id: 'agri',   name: '🌾 Agriculture',  gdpPerWorkerM: 4.5,  defaultPct: 25, color: '#a5d6a7' },
    { id: 'mfg',    name: '🏭 Manufacturing', gdpPerWorkerM: 12,   defaultPct: 18, color: '#ffcc02' },
    { id: 'svc',    name: '🛒 Services',      gdpPerWorkerM: 9,    defaultPct: 35, color: '#81d4fa' },
    { id: 'tech',   name: '💻 Technology',    gdpPerWorkerM: 28,   defaultPct: 6,  color: '#00e676' },
    { id: 'gov',    name: '🏛️ Government',    gdpPerWorkerM: 5,    defaultPct: 8,  color: '#ce93d8' },
    { id: 'edu',    name: '🎓 Education',     gdpPerWorkerM: 4,    defaultPct: 5,  color: '#80cbc4' },
    { id: 'infra',  name: '🔧 Infrastructure',gdpPerWorkerM: 7,    defaultPct: 3,  color: '#ffab91' },
  ],

  // Population growth rate per year
  POP_GROWTH_RATE: 0.013,

  // Budget as % of GDP collected as taxes
  TAX_RATE: 0.20,

  // How fast levels rise per ₱B invested (diminishing returns at high levels)
  EDU_GAIN_PER_B:   0.35,
  INFRA_GAIN_PER_B: 0.28,
  TECH_GAIN_PER_B:  0.45,

  // Natural decay of levels per year (maintenance cost)
  LEVEL_DECAY: 0.8,

  // Productivity multiplier per level point (1 + level * modifier)
  EDU_PROD_MOD:   0.005,
  INFRA_PROD_MOD: 0.004,
  TECH_PROD_MOD:  0.007,

  // Trade: exports boost GDP, imports drain it
  EXPORT_GDP_FACTOR: 0.0018,
  IMPORT_DRAG:       0.0010,
};

// ─────────────────────────────────────────────────────────
// 2. WORLD EVENTS
//    Random annual events that shake up the economy.
// ─────────────────────────────────────────────────────────
const WORLD_EVENTS = [
  {
    name: 'Global Tech Boom',
    desc: 'International demand for tech workers surges.',
    effect: (gs) => { gs.gdpMultiplier += 0.08; gs.stability += 5; },
    display: '+8% GDP, +5 Stability'
  },
  {
    name: 'Global Recession',
    desc: 'World trade contracts sharply. Exports suffer.',
    effect: (gs) => { gs.gdpMultiplier -= 0.10; gs.tradeBalance -= 15; },
    display: '-10% GDP, -₱15B Trade'
  },
  {
    name: 'Natural Disaster',
    desc: 'Typhoons damage infrastructure and agriculture.',
    effect: (gs) => { gs.infraLevel = Math.max(0, gs.infraLevel - 8); gs.stability -= 8; },
    display: '-8 Infrastructure, -8 Stability'
  },
  {
    name: 'Foreign Investment Surge',
    desc: 'Favorable ratings attract foreign capital.',
    effect: (gs) => { gs.gdpMultiplier += 0.06; gs.workforce.tech += 50000; },
    display: '+6% GDP, +50K Tech Workers'
  },
  {
    name: 'Brain Drain Wave',
    desc: 'Skilled workers emigrate for better opportunities abroad.',
    effect: (gs) => {
      const loss = Math.floor(gs.workforce.tech * 0.08);
      gs.workforce.tech = Math.max(0, gs.workforce.tech - loss);
      gs.stability -= 5;
    },
    display: '-8% Tech Workers, -5 Stability'
  },
  {
    name: 'Tourism Boom',
    desc: 'International arrivals hit record highs.',
    effect: (gs) => { gs.gdpMultiplier += 0.04; gs.tradeBalance += 8; },
    display: '+4% GDP, +₱8B Trade Balance'
  },
  {
    name: 'Trade War',
    desc: 'Key trading partners impose tariffs on your exports.',
    effect: (gs) => { gs.tradeBalance -= 20; gs.gdpMultiplier -= 0.03; },
    display: '-₱20B Trade, -3% GDP'
  },
  {
    name: 'Pandemic',
    desc: 'Health crisis disrupts labor markets and supply chains.',
    effect: (gs) => {
      gs.gdpMultiplier -= 0.15;
      gs.stability -= 12;
      gs.unemploymentExtra += 3;
    },
    display: '-15% GDP, -12 Stability, +3% Unemployment'
  },
  {
    name: 'Green Energy Revolution',
    desc: 'Renewable energy drives productivity gains.',
    effect: (gs) => { gs.techLevel += 4; gs.infraLevel += 3; },
    display: '+4 Technology, +3 Infrastructure'
  },
  {
    name: 'Demographic Dividend',
    desc: 'Young workforce enters the economy at scale.',
    effect: (gs) => {
      gs.workingAgePop = Math.floor(gs.workingAgePop * 1.03);
      gs.stability += 4;
    },
    display: '+3% Working-Age Pop, +4 Stability'
  },
  { name: 'Stable Year', desc: 'A relatively calm year with no major global shocks.', effect: () => {}, display: 'No effect' },
  { name: 'Stable Year', desc: 'Global markets remain balanced.', effect: () => {}, display: 'No effect' },
];

// ─────────────────────────────────────────────────────────
// 3. GAME STATE
//    The single source of truth for all game data.
// ─────────────────────────────────────────────────────────
let gs = {};  // gs = "game state"

function initGameState() {
  gs = {
    // ── Time ──────────────────────────────────────────
    year: CONSTANTS.START_YEAR,
    turn: 0,

    // ── Population ────────────────────────────────────
    totalPop:      120_000_000,
    workingAgePop: 0,   // calculated below
    laborForce:    0,   // 60% of working age

    // ── Workforce (workers per industry) ──────────────
    workforce: {},

    // ── Economy ───────────────────────────────────────
    gdp:           0,    // ₱ Billion
    prevGdp:       0,
    gdpGrowthRate: 0,    // %
    gdpMultiplier: 1.0,  // modified by events
    budget:        600,  // ₱ Billion
    debt:          40,   // % of GDP
    tradeBalance:  -10,  // ₱ Billion (negative = deficit)
    unemploymentExtra: 0, // extra unemployment from events

    // ── National Levels (0–100) ───────────────────────
    eduLevel:   30,
    infraLevel: 25,
    techLevel:  20,
    stability:  60,

    // ── Competitiveness Score (0–100) ─────────────────
    score: 0,

    // ── Win/Lose Tracking ─────────────────────────────
    negGdpYears: 0,
    gameOver: false,

    // ── Historical log ────────────────────────────────
    history: [],
  };

  // Derived population values
  gs.workingAgePop = Math.floor(gs.totalPop * 0.65);
  gs.laborForce    = Math.floor(gs.workingAgePop * 0.60);

  // Initialize workforce from default percentages
  CONSTANTS.INDUSTRIES.forEach(ind => {
    gs.workforce[ind.id] = Math.floor(gs.laborForce * (ind.defaultPct / 100));
  });

  // Initial GDP calculation
  gs.gdp     = calcGDP();
  gs.prevGdp = gs.gdp;
  gs.budget  = gs.gdp * CONSTANTS.TAX_RATE;
  gs.score   = calcScore();
}

// ─────────────────────────────────────────────────────────
// 4. GDP CALCULATION
//    Each industry contributes based on workers + multipliers.
// ─────────────────────────────────────────────────────────
function calcGDP() {
  // Productivity multiplier from levels
  const prodMult = 1
    + gs.eduLevel   * CONSTANTS.EDU_PROD_MOD
    + gs.infraLevel * CONSTANTS.INFRA_PROD_MOD
    + gs.techLevel  * CONSTANTS.TECH_PROD_MOD;

  let total = 0;
  CONSTANTS.INDUSTRIES.forEach(ind => {
    const workersM = (gs.workforce[ind.id] || 0) / 1_000_000; // in millions
    total += workersM * ind.gdpPerWorkerM * prodMult;
  });

  // Apply global multiplier (modified by events)
  total *= gs.gdpMultiplier;

  // Trade effect
  total += gs.tradeBalance * 0.3;

  return Math.max(0, total);
}

// ─────────────────────────────────────────────────────────
// 5. COMPETITIVENESS SCORE
//    Composite index from multiple factors (0–100).
// ─────────────────────────────────────────────────────────
function calcScore() {
  const gdpPerCapita = (gs.gdp * 1e9) / gs.totalPop; // ₱ per person
  const gdpScore     = Math.min(40, gdpPerCapita / 750); // cap at 40pts

  const levelScore   = (gs.eduLevel + gs.infraLevel + gs.techLevel) / 7.5; // cap 40pts
  const tradeScore   = Math.min(10, Math.max(0, (gs.tradeBalance + 50) / 10));
  const stabScore    = gs.stability / 10; // cap 10pts

  return Math.min(100, Math.max(0,
    gdpScore + levelScore + tradeScore + stabScore
  ));
}

// ─────────────────────────────────────────────────────────
// 6. UNEMPLOYMENT CALCULATION
// ─────────────────────────────────────────────────────────
function calcUnemployment() {
  const totalEmployed = Object.values(gs.workforce).reduce((a, b) => a + b, 0);
  const unemployed    = Math.max(0, gs.laborForce - totalEmployed);
  const rate          = (unemployed / gs.laborForce) * 100 + gs.unemploymentExtra;
  return { employed: totalEmployed, unemployed: Math.floor(unemployed), rate: Math.min(100, rate) };
}

// ─────────────────────────────────────────────────────────
// 7. READ PLAYER INPUTS
//    Pull values from sliders/inputs into game state.
// ─────────────────────────────────────────────────────────
function readPlayerInputs() {
  const eduInvest   = +document.getElementById('sl-edu').value;
  const infraInvest = +document.getElementById('sl-infra').value;
  const techInvest  = +document.getElementById('sl-tech').value;
  const exportDrive = +document.getElementById('sl-export').value;
  const govSpend    = +document.getElementById('sl-gov').value;

  // Total investment spending (capped by available budget)
  const totalInvest = eduInvest + infraInvest + techInvest;

  // Level gains: investment drives levels up; decay pulls them down
  gs.eduLevel   = Math.min(100, Math.max(0,
    gs.eduLevel - CONSTANTS.LEVEL_DECAY
    + eduInvest * CONSTANTS.EDU_GAIN_PER_B * diminish(gs.eduLevel)
  ));
  gs.infraLevel = Math.min(100, Math.max(0,
    gs.infraLevel - CONSTANTS.LEVEL_DECAY
    + infraInvest * CONSTANTS.INFRA_GAIN_PER_B * diminish(gs.infraLevel)
  ));
  gs.techLevel  = Math.min(100, Math.max(0,
    gs.techLevel - CONSTANTS.LEVEL_DECAY
    + techInvest * CONSTANTS.TECH_GAIN_PER_B * diminish(gs.techLevel)
  ));

  // Trade balance: more exports = better trade (offset by imports proportional to GDP)
  const exportBonus = (exportDrive / 100) * gs.gdp * CONSTANTS.EXPORT_GDP_FACTOR * 1000;
  const importDrag  = gs.gdp * CONSTANTS.IMPORT_DRAG * 1000;
  gs.tradeBalance   = exportBonus - importDrag;

  // Budget: govt collects tax, spends a portion, rest is surplus/deficit
  const taxRevenue = gs.gdp * CONSTANTS.TAX_RATE;
  const spending   = taxRevenue * (govSpend / 100) + totalInvest;
  const surplus    = taxRevenue - spending;
  gs.budget       += surplus;

  // If spending > revenue, debt increases
  if (surplus < 0) {
    const debtIncrease = (-surplus / gs.gdp) * 100;
    gs.debt = Math.min(200, gs.debt + debtIncrease);
  } else {
    gs.debt = Math.max(0, gs.debt - (surplus / gs.gdp) * 80);
  }

  // Stability is affected by debt and unemployment
  const { rate: unempRate } = calcUnemployment();
  gs.stability = Math.max(0, Math.min(100,
    gs.stability
    - (gs.debt > 80 ? (gs.debt - 80) * 0.1 : 0)
    - (unempRate > 15 ? (unempRate - 15) * 0.3 : 0)
    + (surplus > 0 ? 1 : -1)
  ));

  // Read workforce allocation sliders
  const total = readWorkforceSliders();
  return { eduInvest, infraInvest, techInvest, exportDrive, govSpend, totalInvest, surplus, unempRate, total };
}

// ─────────────────────────────────────────────────────────
// 8. DIMINISHING RETURNS
//    High levels gain less from investment (realistic).
// ─────────────────────────────────────────────────────────
function diminish(level) {
  // Returns a multiplier that decreases as level rises
  return Math.max(0.05, 1 - (level / 120));
}

// ─────────────────────────────────────────────────────────
// 9. WORKFORCE SLIDERS
//    Read industry allocation %, convert to worker counts.
// ─────────────────────────────────────────────────────────
function readWorkforceSliders() {
  let total = 0;
  CONSTANTS.INDUSTRIES.forEach(ind => {
    const el = document.getElementById('wf-' + ind.id);
    if (el) {
      const pct = +el.value;
      total += pct;
      gs.workforce[ind.id] = Math.floor(gs.laborForce * (pct / 100));
    }
  });

  // Warn if not 100%
  const warn = document.getElementById('alloc-warning');
  if (Math.abs(total - 100) > 1) {
    warn.classList.remove('hidden');
    // Auto-correct: dump remainder into services
    const diff = 100 - total;
    gs.workforce['svc'] = Math.floor(gs.laborForce * ((+document.getElementById('wf-svc').value + diff) / 100));
  } else {
    warn.classList.add('hidden');
  }
  return total;
}

// ─────────────────────────────────────────────────────────
// 10. PICK RANDOM WORLD EVENT
// ─────────────────────────────────────────────────────────
function pickEvent() {
  const idx = Math.floor(Math.random() * WORLD_EVENTS.length);
  return WORLD_EVENTS[idx];
}

// ─────────────────────────────────────────────────────────
// 11. MAIN GAME LOOP — "NEXT YEAR" BUTTON
// ─────────────────────────────────────────────────────────
function nextYear() {
  if (gs.gameOver) return;

  gs.turn++;
  gs.year++;

  // Reset per-turn modifiers
  gs.gdpMultiplier  = 1.0;
  gs.unemploymentExtra = 0;

  // Apply player's investment and allocation decisions
  const inputs = readPlayerInputs();

  // Pick and apply a world event
  const event = pickEvent();
  event.effect(gs);
  updateEventBox(event);

  // Grow population
  gs.totalPop      = Math.floor(gs.totalPop * (1 + CONSTANTS.POP_GROWTH_RATE));
  gs.workingAgePop = Math.floor(gs.totalPop * 0.65);
  gs.laborForce    = Math.floor(gs.workingAgePop * 0.60);

  // Recalculate GDP and score
  gs.prevGdp       = gs.gdp;
  gs.gdp           = calcGDP();
  gs.gdpGrowthRate = gs.prevGdp > 0 ? ((gs.gdp - gs.prevGdp) / gs.prevGdp) * 100 : 0;
  gs.budget        = gs.gdp * CONSTANTS.TAX_RATE + (inputs.surplus || 0);
  gs.score         = calcScore();

  // Track negative GDP years (for lose condition)
  if (gs.gdp < gs.prevGdp) {
    gs.negGdpYears++;
  } else {
    gs.negGdpYears = 0; // reset streak if GDP recovers
  }

  // Build annual report and history entry
  const emp = calcUnemployment();
  buildReport(emp, inputs, event);
  addHistoryEntry(emp);

  // Render everything
  renderAll(emp);

  // Check win / lose conditions
  checkEndConditions(emp);
}

// ─────────────────────────────────────────────────────────
// 12. WIN / LOSE CHECK
// ─────────────────────────────────────────────────────────
function checkEndConditions(emp) {
  // WIN
  if (gs.score >= CONSTANTS.MAX_SCORE_WIN) {
    endGame(true,
      '🏆 Global Competitive Leader!',
      `In ${gs.year}, the Philippines achieved a Competitiveness Score of ${gs.score.toFixed(1)} — ` +
      `surpassing the 85-point threshold. The nation is now a regional economic powerhouse ` +
      `with a GDP of ₱${gs.gdp.toFixed(0)} Billion. Excellent leadership!`
    );
    return;
  }

  // LOSE — Unemployment
  if (emp.rate > CONSTANTS.UNEMP_LOSE) {
    endGame(false,
      '💀 Unemployment Crisis',
      `Unemployment reached ${emp.rate.toFixed(1)}%, triggering social unrest and government collapse. ` +
      `Millions are without work. The economy has failed its people.`
    );
    return;
  }

  // LOSE — Debt
  if (gs.debt > CONSTANTS.DEBT_LOSE) {
    endGame(false,
      '🏚️ Sovereign Debt Crisis',
      `National debt reached ${gs.debt.toFixed(1)}% of GDP. International creditors have cut off financing. ` +
      `The nation cannot service its obligations. Economic collapse follows.`
    );
    return;
  }

  // LOSE — Consecutive negative GDP years
  if (gs.negGdpYears >= CONSTANTS.NEG_GDP_LOSE) {
    endGame(false,
      '📉 Economic Depression',
      `GDP has contracted for ${gs.negGdpYears} consecutive years. The economy is in a deep depression. ` +
      `Investment has dried up and recovery seems impossible without structural reform.`
    );
    return;
  }
}

// ─────────────────────────────────────────────────────────
// 13. END GAME MODAL
// ─────────────────────────────────────────────────────────
function endGame(win, title, body) {
  gs.gameOver = true;
  document.getElementById('modal-icon').textContent  = win ? '🏆' : '💀';
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  document.getElementById('modal-btn').textContent   = win ? 'PLAY AGAIN' : 'TRY AGAIN';
  document.getElementById('modal-overlay').classList.remove('hidden');
}

// ─────────────────────────────────────────────────────────
// 14. RENDER ALL — UPDATE THE UI
// ─────────────────────────────────────────────────────────
function renderAll(emp) {
  const fmt  = n => n >= 1000 ? (n / 1000).toFixed(2) + 'T' : n.toFixed(1) + 'B';
  const fmtP = n => n.toFixed(1) + '%';
  const fmtM = n => (n / 1_000_000).toFixed(2) + 'M';

  // ── Top bar ──────────────────────────────────────────
  document.getElementById('hdr-year').textContent  = gs.year;
  document.getElementById('hdr-gdp').textContent   = '₱' + fmt(gs.gdp);
  document.getElementById('hdr-score').textContent = gs.score.toFixed(1);

  // Status chip
  const statusEl = document.getElementById('hdr-status');
  const chip     = document.getElementById('hdr-status-chip');
  let status     = 'STABLE';
  let chipColor  = 'var(--green)';
  if (gs.stability < 30 || emp.rate > 20 || gs.debt > 100) {
    status = 'CRISIS'; chipColor = 'var(--red)';
  } else if (gs.stability < 50 || emp.rate > 15 || gs.debt > 70) {
    status = 'AT RISK'; chipColor = 'var(--amber)';
  }
  statusEl.textContent = status;
  chip.style.borderColor = chipColor;
  chip.style.background  = chipColor + '22';
  statusEl.style.color   = chipColor;

  // ── Year display ──────────────────────────────────
  document.getElementById('year-display').textContent = gs.year;

  // ── KPI Cards ─────────────────────────────────────
  document.getElementById('kpi-pop').textContent    = fmtM(gs.totalPop);
  document.getElementById('kpi-emp').textContent    = fmtM(emp.employed);
  document.getElementById('kpi-unemp').textContent  = fmtP(emp.rate);
  document.getElementById('kpi-gdp').textContent    = '₱' + fmt(gs.gdp);
  document.getElementById('kpi-budget').textContent = '₱' + fmt(gs.budget);
  document.getElementById('kpi-debt').textContent   = fmtP(gs.debt);
  document.getElementById('kpi-trade').textContent  =
    (gs.tradeBalance >= 0 ? '+' : '') + '₱' + gs.tradeBalance.toFixed(1) + 'B';
  document.getElementById('kpi-negyr').textContent  = gs.negGdpYears + ' / ' + CONSTANTS.NEG_GDP_LOSE;

  // Color debt card based on risk
  const debtKpi = document.getElementById('kpi-debt');
  debtKpi.style.color = gs.debt > 100 ? 'var(--red)'
                      : gs.debt > 60  ? 'var(--amber)'
                      : 'var(--green)';

  // ── Level bars ────────────────────────────────────
  updateLevelBar('edu',   gs.eduLevel);
  updateLevelBar('infra', gs.infraLevel);
  updateLevelBar('tech',  gs.techLevel);
  updateLevelBar('stab',  gs.stability);

  // Update slider badges
  updateLevelBadge('lv-edu',   gs.eduLevel);
  updateLevelBadge('lv-infra', gs.infraLevel);
  updateLevelBadge('lv-tech',  gs.techLevel);

  // ── Competitiveness ring ──────────────────────────
  const arc     = document.getElementById('score-arc');
  const maxCirc = 213.5;
  const offset  = maxCirc - (gs.score / 100) * maxCirc;
  arc.style.strokeDashoffset = offset;
  document.getElementById('score-ring-text').textContent = Math.round(gs.score);

  // Ring color: green if winning, amber if mid, red if low
  const arcColor = gs.score >= 85 ? 'var(--green)'
                 : gs.score >= 55 ? 'var(--cyan)'
                 : gs.score >= 35 ? 'var(--amber)'
                 : 'var(--red)';
  arc.style.stroke = arcColor;
}

function updateLevelBar(key, val) {
  const fill = document.getElementById('lvbar-' + key);
  const num  = document.getElementById('lvnum-' + key);
  if (fill) fill.style.width = Math.min(100, val) + '%';
  if (num)  num.textContent  = Math.round(val);
}

function updateLevelBadge(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  const lv = Math.floor(val / 20); // 0-4 range (20pts per level)
  el.textContent = 'LV ' + lv;
}

// ─────────────────────────────────────────────────────────
// 15. ANNUAL REPORT
// ─────────────────────────────────────────────────────────
function buildReport(emp, inputs, event) {
  const box = document.getElementById('report-content');
  const gdpChange = gs.gdpGrowthRate;

  const lines = [
    { cls: 'head', txt: `📅 Year ${gs.year} — Annual Economic Report` },
    {
      cls: gdpChange >= 0 ? 'good' : 'bad',
      txt: `GDP: ₱${gs.gdp.toFixed(1)}B (${gdpChange >= 0 ? '+' : ''}${gdpChange.toFixed(2)}% vs last year)`
    },
    {
      cls: emp.rate > 20 ? 'bad' : emp.rate > 12 ? 'note' : 'good',
      txt: `Unemployment: ${emp.rate.toFixed(1)}% (${(emp.employed / 1e6).toFixed(2)}M employed)`
    },
    {
      cls: gs.debt > 100 ? 'bad' : gs.debt > 60 ? 'note' : 'good',
      txt: `Debt: ${gs.debt.toFixed(1)}% of GDP`
    },
    {
      cls: gs.tradeBalance >= 0 ? 'good' : 'note',
      txt: `Trade Balance: ${gs.tradeBalance >= 0 ? '+' : ''}₱${gs.tradeBalance.toFixed(1)}B`
    },
    {
      cls: 'note',
      txt: `Budget Surplus/Deficit: ${inputs.surplus >= 0 ? '+' : ''}₱${(inputs.surplus || 0).toFixed(1)}B`
    },
    { cls: 'note', txt: `World Event: ${event.name} → ${event.display}` },
    { cls: 'note', txt: `Competitiveness Score: ${gs.score.toFixed(1)} / 100` },
    {
      cls: gs.score >= 85 ? 'good' : gs.score >= 55 ? 'note' : 'bad',
      txt: gs.score >= 85 ? '🏆 WIN CONDITION MET! You are globally competitive!' :
           gs.score >= 70 ? '📈 Close to winning — keep investing!' :
           gs.score >= 50 ? '⚙️ Mid-tier economy — accelerate reforms.' :
           '⚠️ Low competitiveness — urgent action required!'
    },
  ];

  box.innerHTML = lines.map(l =>
    `<div class="report-line ${l.cls}">${l.txt}</div>`
  ).join('');
}

// ─────────────────────────────────────────────────────────
// 16. HISTORY LOG
// ─────────────────────────────────────────────────────────
function addHistoryEntry(emp) {
  gs.history.unshift({
    year: gs.year,
    gdp: gs.gdp,
    score: gs.score,
    unemp: emp.rate,
    debt: gs.debt,
  });

  const list = document.getElementById('log-list');
  list.innerHTML = gs.history.slice(0, 15).map(h =>
    `<div class="log-entry">
      <span class="log-year">${h.year}</span>
      <span>GDP ₱${h.gdp.toFixed(0)}B | Score ${h.score.toFixed(0)} | Unemp ${h.unemp.toFixed(1)}% | Debt ${h.debt.toFixed(0)}%</span>
    </div>`
  ).join('');
}

// ─────────────────────────────────────────────────────────
// 17. EVENT BOX UPDATE
// ─────────────────────────────────────────────────────────
function updateEventBox(event) {
  document.getElementById('event-name').textContent   = event.name;
  document.getElementById('event-desc').textContent   = event.desc;
  document.getElementById('event-effect').textContent = '→ ' + event.display;
}

// ─────────────────────────────────────────────────────────
// 18. SLIDER LABEL UPDATER (called on input)
// ─────────────────────────────────────────────────────────
function updateSliderLabel(sliderId, labelId) {
  const val = document.getElementById(sliderId).value;
  document.getElementById(labelId).textContent = val;

  // Update the small progress bar for investment sliders
  const barMap = { 'sl-edu': 'bar-edu', 'sl-infra': 'bar-infra', 'sl-tech': 'bar-tech' };
  const barId  = barMap[sliderId];
  if (barId) {
    const max  = +document.getElementById(sliderId).max;
    document.getElementById(barId).style.width = ((val / max) * 100) + '%';
  }
}

// ─────────────────────────────────────────────────────────
// 19. BUILD INDUSTRY WORKFORCE SLIDERS (dynamic generation)
// ─────────────────────────────────────────────────────────
function buildIndustrySliders() {
  const container = document.getElementById('industry-sliders');
  container.innerHTML = CONSTANTS.INDUSTRIES.map(ind => `
    <div class="ind-slider-row">
      <span class="ind-label">${ind.name}</span>
      <input type="range" min="0" max="80" value="${ind.defaultPct}"
             id="wf-${ind.id}"
             oninput="updateIndLabel('${ind.id}')"
             style="accent-color: ${ind.color};" />
      <span class="ind-val" id="wfval-${ind.id}">${ind.defaultPct}%</span>
    </div>
  `).join('');
}

function updateIndLabel(indId) {
  const val = document.getElementById('wf-' + indId).value;
  document.getElementById('wfval-' + indId).textContent = val + '%';
}

// ─────────────────────────────────────────────────────────
// 20. RESET / RESTART
// ─────────────────────────────────────────────────────────
function resetGame() {
  document.getElementById('modal-overlay').classList.add('hidden');
  initGameState();

  // Reset sliders to defaults
  document.getElementById('sl-edu').value    = 10;
  document.getElementById('sl-infra').value  = 8;
  document.getElementById('sl-tech').value   = 5;
  document.getElementById('sl-export').value = 50;
  document.getElementById('sl-gov').value    = 40;

  document.getElementById('val-edu').textContent    = 10;
  document.getElementById('val-infra').textContent  = 8;
  document.getElementById('val-tech').textContent   = 5;
  document.getElementById('val-export').textContent = 50;
  document.getElementById('val-gov').textContent    = 40;

  document.getElementById('bar-edu').style.width   = '16%';
  document.getElementById('bar-infra').style.width = '13%';
  document.getElementById('bar-tech').style.width  = '8%';

  CONSTANTS.INDUSTRIES.forEach(ind => {
    const el = document.getElementById('wf-' + ind.id);
    if (el) {
      el.value = ind.defaultPct;
      document.getElementById('wfval-' + ind.id).textContent = ind.defaultPct + '%';
    }
  });

  // Clear report and log
  document.getElementById('report-content').innerHTML =
    '<p class="report-placeholder">Your annual economic summary will appear here after each turn.</p>';
  document.getElementById('log-list').innerHTML = '';
  document.getElementById('event-name').textContent  = '—';
  document.getElementById('event-desc').textContent  = 'Press "Advance Year" to start simulation.';
  document.getElementById('event-effect').textContent = '';

  const emp = calcUnemployment();
  renderAll(emp);
}

// ─────────────────────────────────────────────────────────
// 21. STARTUP — INITIALISE EVERYTHING
// ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildIndustrySliders();   // Generate industry sliders dynamically
  initGameState();          // Set initial state
  const emp = calcUnemployment();
  renderAll(emp);           // Paint the initial UI

  // Set initial progress bar widths
  document.getElementById('bar-edu').style.width   = '16%';
  document.getElementById('bar-infra').style.width = '13%';
  document.getElementById('bar-tech').style.width  = '8%';

  console.log('🌏 Geo-Economics Simulator loaded. Initial state:', gs);
});

/* ══════════════════════════════════════════════════════════
   HOW TO EXPAND THIS GAME (suggestions):

   1. DIPLOMACY: Add ally/rival countries with trade bonuses/penalties.
   2. ELECTIONS: Every 6 years, simulate an election based on stability.
   3. REGIONAL MAP: Clickable island regions (Luzon, Visayas, Mindanao)
      each with their own stats affecting national totals.
   4. TECHNOLOGY TREE: Unlock new industries (Semiconductors, AI, etc.)
      once Tech Level hits thresholds.
   5. SOCIAL INDICATORS: Add Health, Poverty Rate, Gini coefficient.
   6. SAVE/LOAD: Use localStorage to persist game state across sessions.
   7. CHARTS: Add a Chart.js GDP/Score line graph per year.
   8. MULTIPLE COUNTRIES: Let the player choose from a list of countries
      each with different starting stats.
   9. POLICY CARDS: One-time special policies (e.g., "Build a Tech Hub",
      "Sign Free Trade Agreement") with resource costs.
  10. NARRATIVE EVENTS: Story-based branching events with choices
      (e.g., "Foreign company wants to build a factory — allow?").
══════════════════════════════════════════════════════════ */
