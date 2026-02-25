/* ═══════════════════════════════════════════════════════
   PH Nation Builder — script.js
   Real Philippines starting data (2025 estimates).
   Simple, engaging, educational economic sim.
═══════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────
// REAL PHILIPPINES STARTING DATA (2025 estimates)
// ─────────────────────────────────────────────────────
const START = {
  population:    118_000_000,   // ~118 million Filipinos
  ofwCount:       10_600_000,   // ~10.6 million OFWs abroad
  domesticWorkers:50_000_000,   // ~50 million domestic workers
  unemployed:      2_300_000,   // ~4.5% of domestic labor force
  gdp:            26_000,       // ₱26 Trillion → stored as ₱ Billion = 26,000 B
  remittances:     1_850,       // ₱1.85 Trillion/year → 1,850 B
  debt:               60,       // ~60% of GDP
  tradeBalance:     -500,       // Trade deficit ~₱500B/year
  eduLevel:          38,        // Education level 0-100 (PH is above mid)
  infraLevel:        32,        // Infrastructure (roads/ports are below average globally)
  techLevel:         28,        // Technology (BPO strong but digital lagging)
  stability:         65,        // Social stability
};

// ─────────────────────────────────────────────────────
// WORLD EVENTS
// ─────────────────────────────────────────────────────
const EVENTS = [
  {
    name: '🚀 Global Tech Boom',
    desc: 'International companies expand BPO and IT outsourcing in Southeast Asia.',
    effect(gs) { gs.techBoost = 0.12; gs.gdpMult += 0.08; gs.stability += 5; },
    tip: 'Great year to surge Technology investment!'
  },
  {
    name: '📉 Global Recession',
    desc: 'World economies slow. OFW remittances drop and export demand falls.',
    effect(gs) { gs.gdpMult -= 0.10; gs.remittances *= 0.88; gs.tradeBalance -= 300; },
    tip: 'Cut spending to avoid debt. Keep Education — it protects long-term growth.'
  },
  {
    name: '🌪️ Super Typhoon',
    desc: 'A powerful typhoon hits Luzon and Visayas, damaging crops and infrastructure.',
    effect(gs) { gs.infraLevel = Math.max(0, gs.infraLevel - 10); gs.gdpMult -= 0.06; gs.stability -= 8; },
    tip: 'Boost Infrastructure spending next turn to rebuild.'
  },
  {
    name: '💰 Foreign Investment Surge',
    desc: 'Investors choose PH for manufacturing and digital hubs after high competitiveness ratings.',
    effect(gs) { gs.gdpMult += 0.07; gs.techLevel += 4; gs.stability += 4; },
    tip: 'Ride the wave — increase Tech and Infrastructure spending!'
  },
  {
    name: '✈️ Brain Drain Wave',
    desc: 'High-skilled Filipinos leave for jobs in the US, Canada, and Europe.',
    effect(gs) { gs.techLevel = Math.max(0, gs.techLevel - 6); gs.eduLevel = Math.max(0, gs.eduLevel - 3); gs.stability -= 5; },
    tip: 'Reduce OFW Policy lever for 1–2 turns. Invest more in Education.'
  },
  {
    name: '🌏 ASEAN Trade Deal',
    desc: 'The Philippines signs a major regional free trade agreement.',
    effect(gs) { gs.tradeBalance += 400; gs.gdpMult += 0.05; },
    tip: 'Increase Trade Openness lever to capitalise on this!'
  },
  {
    name: '⚔️ Trade War',
    desc: 'Key trading partners impose tariffs on Philippine exports.',
    effect(gs) { gs.tradeBalance -= 500; gs.gdpMult -= 0.04; },
    tip: 'Lower Trade Openness temporarily. Boost domestic industry.'
  },
  {
    name: '🦠 Pandemic',
    desc: 'A health crisis shuts down major industries and spikes unemployment.',
    effect(gs) { gs.gdpMult -= 0.15; gs.stability -= 14; gs.unempBonus += 3; },
    tip: 'Emergency: cut spending to prevent debt. Protect Social Services to hold stability.'
  },
  {
    name: '⚡ Renewable Energy Breakthrough',
    desc: 'Solar and wind power costs collapse. PH builds massive renewable capacity.',
    effect(gs) { gs.infraLevel += 5; gs.techLevel += 3; gs.gdpMult += 0.03; },
    tip: 'Good year to invest — multipliers are elevated.'
  },
  {
    name: '📊 OFW Remittance Record',
    desc: 'OFWs send a record amount home, boosting household consumption.',
    effect(gs) { gs.remittances *= 1.12; gs.stability += 5; },
    tip: 'Strong domestic consumption year — focus on Tech to capitalise.'
  },
  {
    name: '🌾 El Niño Drought',
    desc: 'Severe drought hits agriculture. Rice and fish production drop.',
    effect(gs) { gs.gdpMult -= 0.05; gs.stability -= 6; gs.unempBonus += 1.5; },
    tip: 'Boost Social Services this turn to protect the poor.'
  },
  { name: '🟢 Stable Year', desc: 'A relatively uneventful year globally. Normal economic conditions.', effect() {}, tip: 'Normal year — stay the course with long-term investments.' },
  { name: '🟢 Stable Year', desc: 'Global markets are balanced. Good year to build reserves.', effect() {}, tip: 'Build your budget surplus this year.' },
];

// ─────────────────────────────────────────────────────
// LEVER LABELS
// ─────────────────────────────────────────────────────
const LEVER_LABELS = {
  exp: ['Protectionist','Cautious','Medium','Open','Full Open'],
  ofw: ['Keep Home','Selective','Balanced','Encourage','Max Deploy'],
  ind: ['Full Agri','Agri-heavy','Mixed','BPO-focused','Full Tech'],
};

// ─────────────────────────────────────────────────────
// INFO CONTENT (for ⓘ buttons)
// ─────────────────────────────────────────────────────
const INFO = {
  levels: `
    <p><b>National Levels</b> are your country's underlying capability scores (each 0–100).</p>
    <p><b>🎓 Education:</b> How skilled is your workforce? Higher education means every worker produces more. This multiplies GDP from ALL industries and is the most important long-term investment. Think of it as the Philippines investing in schools, universities, and skills training.</p>
    <p><b>🏗️ Infrastructure:</b> Roads, ports, power grids, airports. Poor infrastructure = high transport costs = businesses locate elsewhere. Strong infrastructure = faster growth. Decays if you stop investing. Drops sharply after Super Typhoons.</p>
    <p><b>💡 Technology:</b> Includes R&D, internet access, BPO capacity, digital economy. High tech = high-paying jobs. Works best when Education is also high. This is how the PH grows from call-centers to AI services.</p>
    <p><b>🤝 Stability:</b> Social cohesion — low unrest, public trust. Falls when unemployment rises or debt becomes unsustainable. Low stability hurts investor confidence and GDP. High stability = everything works better.</p>
    <p>Levels <b>decay slightly each year</b> — you must keep investing or they erode.</p>
  `,
  budget: `
    <p><b>Government Budget</b> = roughly 17% of GDP collected as taxes each year.</p>
    <p>If you spend more than the budget, the government goes into <b>deficit</b> → debt increases. If you spend less, you have a <b>surplus</b> → debt slowly decreases.</p>
    <p>The bar turns <b style="color:#f85149">red</b> when you're over budget. This isn't instant death — it just means debt rises. Watch the Debt meter on the right.</p>
    <p>Real PH government budget in 2024: ~₱5.7 Trillion (₱5,700B). Your budget scales with your GDP, just like in real life.</p>
  `,
  levers: `
    <p><b>Economic Levers</b> are your big-picture policy positions. Unlike the budget sliders, these represent strategic direction — not exact money amounts.</p>
    <p><b>📤 Trade Openness:</b> How open are your borders to international trade? The PH exports electronics, semiconductors, OFW services, and BPO. More open = more trade income but more exposure to global shocks like Trade Wars.</p>
    <p><b>✈️ OFW Policy:</b> Do you encourage Filipinos to work abroad or build industries at home? OFWs send billions home in remittances ($38B in 2024!) which is a massive GDP boost. But too many leaving = Brain Drain = tech and education levels drop.</p>
    <p><b>🏭 Industry Focus:</b> Where do you direct economic incentives? Agriculture employs many people but at low wages. Tech/BPO employs fewer people but generates much higher GDP per worker. The PH needs to climb this ladder — but only when Education and Tech levels are ready.</p>
  `
};

// ─────────────────────────────────────────────────────
// GAME STATE
// ─────────────────────────────────────────────────────
let gs = {};

function initGameState() {
  gs = {
    year:           2025,
    turn:           0,
    population:     START.population,
    ofwCount:       START.ofwCount,
    domesticWorkers:START.domesticWorkers,
    unemployed:     START.unemployed,
    gdp:            START.gdp,
    remittances:    START.remittances,
    budget:         Math.round(START.gdp * 0.17),
    debt:           START.debt,
    tradeBalance:   START.tradeBalance,
    eduLevel:       START.eduLevel,
    infraLevel:     START.infraLevel,
    techLevel:      START.techLevel,
    stability:      START.stability,
    score:          0,
    gdpPrev:        START.gdp,
    gdpGrowth:      0,
    negGdpYears:    0,
    unempBonus:     0,
    gdpMult:        1.0,
    techBoost:      0,
    gameOver:       false,
    history:        [],
  };
  gs.score = calcScore();
}

// ─────────────────────────────────────────────────────
// CORE CALCULATIONS
// ─────────────────────────────────────────────────────

/** Productivity multiplier: how much more each worker produces
 *  based on Education, Infrastructure, Technology levels */
function prodMultiplier() {
  return 1
    + gs.eduLevel   * 0.006
    + gs.infraLevel * 0.004
    + gs.techLevel  * 0.008;
}

/** Calculate GDP in ₱ Billion
 *  Combines domestic output + remittances + trade */
function calcGDP() {
  const pm = prodMultiplier();

  // Domestic workers produce based on industry focus lever
  const indFocus = +document.getElementById('ls-ind').value; // 0-4
  // Higher industry focus = more GDP per domestic worker
  const gdpPerWorker = 200 + indFocus * 60; // ₱200K–₱440K per worker, in B units
  const domesticOutput = (gs.domesticWorkers / 1_000_000) * gdpPerWorker * pm;

  // OFW remittances (stored in ₱B already)
  const remitContrib = gs.remittances;

  // Trade
  const tradeContrib = gs.tradeBalance * 0.4;

  const raw = domesticOutput + remitContrib + tradeContrib;
  return Math.max(0, raw * gs.gdpMult);
}

/** Competitiveness Score 0–100 */
function calcScore() {
  // GDP per capita: higher = more points (capped at 40)
  const gdpPerCap = (gs.gdp * 1_000_000_000) / gs.population; // ₱ per person
  const gdpPts = Math.min(40, gdpPerCap / 350_000); // ₱14M/person = 40pts

  // National levels (max 40 pts combined)
  const levelPts = Math.min(40, (gs.eduLevel + gs.infraLevel + gs.techLevel) / 7.5);

  // Trade (max 10)
  const tradePts = Math.min(10, Math.max(0, (gs.tradeBalance + 1000) / 200));

  // Stability (max 10)
  const stabPts = gs.stability / 10;

  return Math.min(100, Math.max(0, gdpPts + levelPts + tradePts + stabPts));
}

/** Unemployment rate as percentage */
function calcUnempRate() {
  const laborForce = gs.domesticWorkers + gs.unemployed;
  return Math.min(50, (gs.unemployed / laborForce) * 100 + gs.unempBonus);
}

// ─────────────────────────────────────────────────────
// MAIN GAME LOOP
// ─────────────────────────────────────────────────────
function nextYear() {
  if (gs.gameOver) return;
  gs.turn++;
  gs.year++;
  gs.gdpMult   = 1.0;
  gs.techBoost = 0;
  gs.unempBonus = 0;

  // Read player inputs
  const eduB = +document.getElementById('bs-edu').value;
  const infB = +document.getElementById('bs-inf').value;
  const tecB = +document.getElementById('bs-tec').value;
  const socB = +document.getElementById('bs-soc').value;
  const totalSpend = eduB + infB + tecB + socB;

  const expLev = +document.getElementById('ls-exp').value; // 0-4
  const ofwLev = +document.getElementById('ls-ofw').value; // 0-4
  const indLev = +document.getElementById('ls-ind').value; // 0-4

  // Fire a world event
  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  event.effect(gs);
  showEvent(event);

  // ── Population growth (~1.6%/year) ──
  gs.population = Math.floor(gs.population * 1.016);

  // ── OFW dynamics ──
  // OFW policy: 0 = keep home, 4 = max deploy
  const ofwTarget = Math.floor(gs.population * (0.065 + ofwLev * 0.012)); // 6.5%–11.3% of pop
  gs.ofwCount = Math.floor(gs.ofwCount * 0.96 + ofwTarget * 0.04); // smooth transition
  // OFW remittances: ~$175/month per OFW, scaled to ₱
  gs.remittances = Math.round(gs.ofwCount * 0.0000175 * (1 + ofwLev * 0.05));

  // ── Domestic workforce ──
  const workingAgePop = Math.floor(gs.population * 0.63);
  const laborForce    = Math.floor(workingAgePop * 0.65); // LFPR ~65%
  // Jobs created by industry focus and tech level
  const jobGrowth = 1 + (indLev * 0.005) + (gs.techLevel * 0.0003);
  gs.domesticWorkers = Math.min(laborForce - 500_000, Math.floor(gs.domesticWorkers * jobGrowth));
  gs.unemployed = Math.max(0, laborForce - gs.domesticWorkers - gs.ofwCount);

  // ── National Levels ──
  // Level gain = investment / diminishing-returns-factor
  const dim = l => Math.max(0.05, 1 - l / 130);
  gs.eduLevel   = Math.min(100, Math.max(0, gs.eduLevel   - 1.0 + eduB * 0.018 * dim(gs.eduLevel)));
  gs.infraLevel = Math.min(100, Math.max(0, gs.infraLevel - 1.2 + infB * 0.015 * dim(gs.infraLevel)));
  gs.techLevel  = Math.min(100, Math.max(0, gs.techLevel  - 0.8 + tecB * 0.022 * dim(gs.techLevel) * (1 + gs.techBoost)));

  // ── Trade balance ──
  const exportFactor = (gs.techLevel * 0.6 + gs.infraLevel * 0.4) / 100;
  gs.tradeBalance = -500 + (expLev * 200) + (exportFactor * 1000 * expLev * 0.5);

  // ── Stability ──
  const unempRate = calcUnempRate();
  gs.stability = Math.max(0, Math.min(100,
    gs.stability
    + (socB * 0.015)               // social services help
    - (unempRate > 8 ? (unempRate - 8) * 0.4 : 0)
    - (gs.debt > 70  ? (gs.debt - 70)  * 0.08 : 0)
    + (gs.stability < 50 ? -1 : 0.5)  // mean-revert pressure
  ));

  // ── Budget & Debt ──
  const taxRev = Math.round(gs.gdp * 0.17);
  gs.budget = taxRev;
  const surplus = taxRev - totalSpend;
  if (surplus < 0) {
    gs.debt = Math.min(200, gs.debt + (-surplus / gs.gdp) * 100);
  } else {
    gs.debt = Math.max(0, gs.debt - (surplus / gs.gdp) * 80);
  }

  // ── GDP ──
  gs.gdpPrev  = gs.gdp;
  gs.gdp      = calcGDP();
  gs.gdpGrowth = gs.gdpPrev > 0 ? ((gs.gdp - gs.gdpPrev) / gs.gdpPrev) * 100 : 0;
  gs.negGdpYears = gs.gdp < gs.gdpPrev ? gs.negGdpYears + 1 : 0;

  // ── Score ──
  gs.score = calcScore();

  // ── Advisor ──
  setAdvisor(unempRate, surplus, event);

  // ── Report ──
  buildReport(unempRate, surplus, event);

  // ── History ──
  gs.history.unshift({ year: gs.year, gdp: gs.gdp, score: gs.score, unemp: unempRate, debt: gs.debt });
  renderLog();

  // ── Render ──
  renderAll(unempRate);

  // ── Check end conditions ──
  checkEnd(unempRate);
}

// ─────────────────────────────────────────────────────
// ADVISOR TIPS
// ─────────────────────────────────────────────────────
function setAdvisor(unempRate, surplus, event) {
  let msg = '';
  // Priority: most urgent first
  if (gs.debt > 120) {
    msg = '🚨 Debt is critical! Cut ALL spending to minimum this turn or risk default. Your legacy cannot be bankruptcy.';
  } else if (unempRate > 20) {
    msg = '🚨 Unemployment is dangerously high. Increase Industry Focus and Social Services. Check that OFW policy is not too restrictive.';
  } else if (gs.negGdpYears >= 2) {
    msg = '⚠️ GDP has declined two years running. Never cut Education to zero — it is the foundation of growth. Boost Tech investment.';
  } else if (gs.techLevel < 30 && gs.turn > 5) {
    msg = '📊 Technology investment is low. The Philippines\' BPO sector is its biggest GDP-growth engine. Push Tech Budget higher.';
  } else if (gs.eduLevel < 35) {
    msg = '🎓 Education is falling behind. Without skilled workers, Tech and BPO investment won\'t help. Education first.';
  } else if (gs.infraLevel < 25) {
    msg = '🏗️ Infrastructure is weak. Poor roads and ports make doing business expensive. Businesses are considering Vietnam instead.';
  } else if (surplus < 0) {
    msg = '💸 You\'re running a budget deficit. Slightly reduce spending this year to stop debt rising. Small cuts, sustainable path.';
  } else if (event.tip) {
    msg = `💡 Advisor on this event: ${event.tip}`;
  } else if (gs.score > 70) {
    msg = '📈 Almost there! Keep investing in Technology and Education. Push Industry Focus toward Tech/BPO to close the gap.';
  } else {
    msg = '✅ Steady progress. Keep Education and Technology spending consistent. Avoid large deficits.';
  }
  document.getElementById('advisor-msg').textContent = msg;
}

// ─────────────────────────────────────────────────────
// PRESIDENTIAL REPORT
// ─────────────────────────────────────────────────────
function buildReport(unempRate, surplus, event) {
  const g = gs.gdpGrowth;
  const lines = [
    { cls:'head', txt:`📅 Year ${gs.year} — Presidential Economic Report` },
    { cls: g >= 0 ? 'good' : 'bad',
      txt: `GDP: ₱${fmtB(gs.gdp)} (${g >= 0 ? '+' : ''}${g.toFixed(1)}% vs last year)` },
    { cls: unempRate > 15 ? 'bad' : unempRate > 8 ? 'note' : 'good',
      txt: `Unemployment: ${unempRate.toFixed(1)}% — ${fmtPpl(gs.unemployed)} jobless` },
    { cls: gs.debt > 100 ? 'bad' : gs.debt > 70 ? 'note' : 'good',
      txt: `Debt: ${gs.debt.toFixed(1)}% of GDP` },
    { cls: surplus >= 0 ? 'good' : 'bad',
      txt: `Budget: ${surplus >= 0 ? 'Surplus' : 'Deficit'} of ₱${fmtB(Math.abs(surplus))}` },
    { cls: gs.tradeBalance >= 0 ? 'good' : 'note',
      txt: `Trade: ${gs.tradeBalance >= 0 ? 'Surplus' : 'Deficit'} ₱${fmtB(Math.abs(gs.tradeBalance))}` },
    { cls: 'note', txt: `OFW Remittances: ₱${fmtB(gs.remittances)} from ${fmtPpl(gs.ofwCount)} abroad` },
    { cls: 'note', txt: `Competitiveness: ${gs.score.toFixed(1)} / 100 (need 85 to win)` },
    {
      cls: gs.score >= 85 ? 'good' : gs.score >= 65 ? 'note' : 'bad',
      txt: gs.score >= 85 ? '🏆 WIN CONDITION MET!'
         : gs.score >= 70 ? '📈 Almost there — push Technology harder!'
         : gs.score >= 50 ? '⚙️ Making progress — stay consistent.'
         :                  '⚠️ Low competitiveness — bold reforms needed!'
    },
  ];

  document.getElementById('report-body').innerHTML =
    lines.map(l => `<div class="rline ${l.cls}">${l.txt}</div>`).join('');
}

// ─────────────────────────────────────────────────────
// EVENT DISPLAY
// ─────────────────────────────────────────────────────
function showEvent(ev) {
  document.getElementById('ev-name').textContent   = ev.name;
  document.getElementById('ev-desc').textContent   = ev.desc;
  document.getElementById('ev-effect').textContent = '';
}

// ─────────────────────────────────────────────────────
// WIN / LOSE
// ─────────────────────────────────────────────────────
function checkEnd(unempRate) {
  if (gs.score >= 85) {
    endGame(true, '🏆 The Philippines Wins!',
      `In ${gs.year}, the Philippines achieved a Competitiveness Score of ${gs.score.toFixed(0)}! GDP reached ₱${fmtB(gs.gdp)}, ${fmtPpl(gs.ofwCount)} OFWs are sending record remittances home, and the nation is a global benchmark. Mabuhay ang Pilipinas!`);
    return;
  }
  if (unempRate > 25) {
    endGame(false, '💀 Unemployment Crisis',
      `Unemployment hit ${unempRate.toFixed(1)}%. Millions of Filipinos are without work. Social unrest has made the economy ungovernable. Try investing more in Social Services and adjusting Industry Focus.`);
    return;
  }
  if (gs.debt > 150) {
    endGame(false, '🏚️ Sovereign Default',
      `Government debt reached ${gs.debt.toFixed(0)}% of GDP. The Philippines cannot pay its lenders. The peso collapses. Remember: spending more than your budget every year creates a debt spiral.`);
    return;
  }
  if (gs.negGdpYears >= 3) {
    endGame(false, '📉 Economic Depression',
      `GDP contracted for ${gs.negGdpYears} straight years. The economy is in freefall. Key lesson: never cut Education to zero during a crisis — it's the only thing that protects long-term output.`);
    return;
  }
}

function endGame(win, title, body) {
  gs.gameOver = true;
  document.getElementById('end-icon').textContent  = win ? '🏆' : '💀';
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-body').textContent  = body;
  document.getElementById('end-btn').textContent   = win ? 'Play Again' : 'Try Again';
  document.getElementById('end-overlay').classList.remove('hidden');
}

function resetGame() {
  document.getElementById('end-overlay').classList.add('hidden');
  // Reset sliders
  document.getElementById('bs-edu').value = 20;
  document.getElementById('bs-inf').value = 15;
  document.getElementById('bs-tec').value = 10;
  document.getElementById('bs-soc').value = 15;
  document.getElementById('ls-exp').value = 2;
  document.getElementById('ls-ofw').value = 2;
  document.getElementById('ls-ind').value = 2;
  initGameState();
  onBudget();
  onLevers();
  document.getElementById('report-body').innerHTML = '<p class="card-desc">Your annual report will appear here after each turn.</p>';
  document.getElementById('log-body').innerHTML = '';
  document.getElementById('ev-name').textContent = '—';
  document.getElementById('ev-desc').textContent = 'Advance the year to see this year\'s global event.';
  document.getElementById('ev-effect').textContent = '';
  document.getElementById('advisor-msg').textContent = 'Welcome back, Mr./Ms. President. Ready for a new term?';
  renderAll(calcUnempRate());
}

// ─────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────
function renderAll(unempRate) {
  // Header
  document.getElementById('h-year').textContent  = gs.year;
  document.getElementById('h-score').innerHTML   = `${Math.round(gs.score)}<small>/100</small>`;
  document.getElementById('turn-year').textContent = gs.year;

  // Status chip
  const statusEl = document.getElementById('h-status');
  const chip     = document.getElementById('hstat-status');
  let status = 'STABLE', bc = 'var(--green)', tc = 'var(--green)';
  if (gs.stability < 30 || unempRate > 20 || gs.debt > 110) {
    status = 'CRISIS'; bc = 'rgba(248,81,73,0.2)'; tc = 'var(--red)';
  } else if (gs.stability < 50 || unempRate > 12 || gs.debt > 80) {
    status = 'AT RISK'; bc = 'rgba(210,153,34,0.15)'; tc = 'var(--amber)';
  }
  statusEl.textContent = status;
  statusEl.style.color = tc;
  chip.style.background = bc;
  chip.style.borderColor = tc;

  // Nation grid
  document.getElementById('v-pop').textContent    = fmtPpl(gs.population);
  document.getElementById('v-work').textContent   = fmtPpl(gs.domesticWorkers);
  document.getElementById('v-ofw').textContent    = fmtPpl(gs.ofwCount);
  const uEl = document.getElementById('v-unemp');
  uEl.textContent = unempRate.toFixed(1) + '%';
  uEl.style.color = unempRate > 15 ? 'var(--red)' : unempRate > 8 ? 'var(--amber)' : 'var(--green)';
  document.getElementById('v-gdp').textContent    = '₱' + fmtB(gs.gdp);
  document.getElementById('v-remit').textContent  = '₱' + fmtB(gs.remittances);
  document.getElementById('v-budget').textContent = '₱' + fmtB(gs.budget);
  const dEl = document.getElementById('v-debt');
  dEl.textContent = gs.debt.toFixed(1) + '%';
  dEl.style.color = gs.debt > 100 ? 'var(--red)' : gs.debt > 70 ? 'var(--amber)' : 'var(--green)';

  // National levels
  setBar('lb-edu','ln-edu', gs.eduLevel);
  setBar('lb-inf','ln-inf', gs.infraLevel);
  setBar('lb-tec','ln-tec', gs.techLevel);
  setBar('lb-sta','ln-sta', gs.stability);

  // Win bar
  const score = Math.min(100, gs.score);
  document.getElementById('win-fill').style.width  = score + '%';
  document.getElementById('win-nums').textContent  = Math.round(score) + ' / 85';
  const wc = document.getElementById('win-fill');
  wc.style.background = score >= 85 ? 'var(--green)'
    : score >= 60 ? 'linear-gradient(90deg,var(--edu),var(--tec))'
    : 'linear-gradient(90deg,var(--edu),var(--inf))';

  // Map overlay
  document.getElementById('mo-score').textContent = Math.round(gs.score);
  document.getElementById('mo-year').textContent  = gs.year;
  const gdpCap = Math.round((gs.gdp * 1_000_000_000) / gs.population);
  document.getElementById('mo-gdpcap').textContent = '₱' + fmtPpl(gdpCap);
  document.getElementById('mo-trade').textContent =
    (gs.tradeBalance >= 0 ? '+' : '') + '₱' + fmtB(Math.abs(gs.tradeBalance));

  // Danger meters
  setDanger('d-unemp','dn-unemp', unempRate, 25, '%');
  setDanger('d-debt', 'dn-debt',  gs.debt,   150, '%');
  setDanger('d-neg',  'dn-neg',   gs.negGdpYears, 3, 'yr');
}

function setBar(fillId, numId, val) {
  const f = document.getElementById(fillId);
  const n = document.getElementById(numId);
  if (f) f.style.width = Math.min(100, Math.max(0, val)) + '%';
  if (n) n.textContent = Math.round(val);
}

function setDanger(fillId, numId, val, max, unit) {
  const pct = Math.min(100, (val / max) * 100);
  const f   = document.getElementById(fillId);
  const n   = document.getElementById(numId);
  if (f) f.style.width = pct + '%';
  if (n) {
    n.textContent = (typeof val === 'number' && !Number.isInteger(val))
      ? val.toFixed(1) + unit
      : val + unit;
    n.style.color = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--green)';
  }
}

function renderLog() {
  document.getElementById('log-body').innerHTML =
    gs.history.slice(0, 15).map(h =>
      `<div class="log-entry">
        <span class="log-yr">${h.year}</span>
        <span>GDP ₱${fmtB(h.gdp)} | Score ${Math.round(h.score)} | Unemp ${h.unemp.toFixed(1)}% | Debt ${Math.round(h.debt)}%</span>
      </div>`
    ).join('');
}

// ─────────────────────────────────────────────────────
// UI HANDLERS (budget + lever live update)
// ─────────────────────────────────────────────────────
function onBudget() {
  const edu = +document.getElementById('bs-edu').value;
  const inf = +document.getElementById('bs-inf').value;
  const tec = +document.getElementById('bs-tec').value;
  const soc = +document.getElementById('bs-soc').value;
  document.getElementById('bv-edu').textContent = edu;
  document.getElementById('bv-inf').textContent = inf;
  document.getElementById('bv-tec').textContent = tec;
  document.getElementById('bv-soc').textContent = soc;

  const total = edu + inf + tec + soc;
  const avail = gs.budget || Math.round(gs.gdp * 0.17);
  const rem   = avail - total;
  const pct   = Math.min(100, (total / avail) * 100);

  document.getElementById('budget-avail').textContent = '₱' + avail + 'B';
  document.getElementById('budget-spent').textContent = '₱' + total + 'B';
  document.getElementById('budget-rem').textContent   = (rem >= 0 ? '₱' : '-₱') + Math.abs(rem) + 'B';

  const fill = document.getElementById('brb-fill');
  fill.style.width = Math.min(120, pct) + '%';
  fill.style.background = rem < 0 ? 'var(--red)' : rem < avail * 0.1 ? 'var(--amber)' : 'var(--green)';

  const cap = document.getElementById('brb-caption');
  cap.textContent = rem < 0
    ? `⚠️ Over budget by ₱${Math.abs(rem)}B — debt will increase`
    : rem === 0 ? '✅ Exactly on budget'
    : `✅ ₱${rem}B surplus — debt will decrease`;
  cap.style.color = rem < 0 ? 'var(--red)' : 'var(--green)';
}

function onLevers() {
  const expV = +document.getElementById('ls-exp').value;
  const ofwV = +document.getElementById('ls-ofw').value;
  const indV = +document.getElementById('ls-ind').value;
  document.getElementById('lv-exp').textContent = LEVER_LABELS.exp[expV];
  document.getElementById('lv-ofw').textContent = LEVER_LABELS.ofw[ofwV];
  document.getElementById('lv-ind').textContent = LEVER_LABELS.ind[indV];
}

// ─────────────────────────────────────────────────────
// GUIDE + INFO MODALS (click-based, NO hover)
// ─────────────────────────────────────────────────────
function openGuide() {
  document.getElementById('guide-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeGuide() {
  document.getElementById('guide-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}
function showTab(tabId, btn) {
  document.querySelectorAll('.gtab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.gtab').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabId);
  if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');
}
function openInfo(key) {
  const content = INFO[key] || '<p>No info available.</p>';
  const titles  = { levels: '📡 National Levels', budget: '💰 Budget System', levers: '🎛️ Economic Levers' };
  document.getElementById('info-title').textContent = titles[key] || 'Info';
  document.getElementById('info-body').innerHTML    = content;
  document.getElementById('info-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeInfo() {
  document.getElementById('info-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────

/** Format a raw person count: 10,600,000 → "10.6M" */
function fmtPpl(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K';
  return String(Math.round(n));
}

/** Format a GDP/budget number already in ₱ Billions:
 *  26,000 → "26,000B"  or  "26.0T" */
function fmtB(n) {
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  return Math.round(n) + 'B';
}

// ─────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initGameState();
  onBudget();
  onLevers();
  renderAll(calcUnempRate());

  // Expose all functions for inline onclick
  Object.assign(window, {
    nextYear, resetGame, openGuide, closeGuide, showTab, openInfo, closeInfo,
    onBudget, onLevers,
  });

  console.log('🇵🇭 PH Nation Builder loaded. Starting GDP: ₱' + fmtB(gs.gdp) + ' | Population: ' + fmtPpl(gs.population));
});
