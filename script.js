/* ══════════════════════════════════════════════════════════
   GEO-ECONOMICS SIMULATOR  ·  script.js
   All game logic, UI, tooltips, and guide modal.
   Everything runs inside DOMContentLoaded to avoid
   "not defined" errors on inline onclick handlers.
══════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────
// 1. GAME CONSTANTS
// ─────────────────────────────────────────────────────────
const CONSTANTS = {
  START_YEAR:    2025,
  MAX_SCORE_WIN: 85,
  UNEMP_LOSE:    25,
  DEBT_LOSE:     150,
  NEG_GDP_LOSE:  3,
  INDUSTRIES: [
    { id: 'agri',  name: '🌾 Agriculture',   gdpPerWorkerM: 4.5,  defaultPct: 25, color: '#a5d6a7' },
    { id: 'mfg',   name: '🏭 Manufacturing',  gdpPerWorkerM: 12,   defaultPct: 18, color: '#ffcc02' },
    { id: 'svc',   name: '🛒 Services',       gdpPerWorkerM: 9,    defaultPct: 35, color: '#81d4fa' },
    { id: 'tech',  name: '💻 Technology',     gdpPerWorkerM: 28,   defaultPct: 6,  color: '#00e676' },
    { id: 'gov',   name: '🏛️ Government',     gdpPerWorkerM: 5,    defaultPct: 8,  color: '#ce93d8' },
    { id: 'edu',   name: '🎓 Education',      gdpPerWorkerM: 4,    defaultPct: 5,  color: '#80cbc4' },
    { id: 'infra', name: '🔧 Infrastructure', gdpPerWorkerM: 7,    defaultPct: 3,  color: '#ffab91' },
  ],
  POP_GROWTH_RATE:   0.013,
  TAX_RATE:          0.20,
  EDU_GAIN_PER_B:    0.35,
  INFRA_GAIN_PER_B:  0.28,
  TECH_GAIN_PER_B:   0.45,
  LEVEL_DECAY:       0.8,
  EDU_PROD_MOD:      0.005,
  INFRA_PROD_MOD:    0.004,
  TECH_PROD_MOD:     0.007,
  EXPORT_GDP_FACTOR: 0.0018,
  IMPORT_DRAG:       0.0010,
};

// ─────────────────────────────────────────────────────────
// 2. WORLD EVENTS
// ─────────────────────────────────────────────────────────
const WORLD_EVENTS = [
  { name:'Global Tech Boom',         desc:'International demand for tech workers surges.',           effect:gs=>{gs.gdpMultiplier+=0.08;gs.stability+=5;},                                                                           display:'+8% GDP, +5 Stability' },
  { name:'Global Recession',         desc:'World trade contracts sharply. Exports suffer.',          effect:gs=>{gs.gdpMultiplier-=0.10;gs.tradeBalance-=15;},                                                                        display:'-10% GDP, -₱15B Trade' },
  { name:'Natural Disaster',         desc:'Typhoons damage infrastructure and agriculture.',         effect:gs=>{gs.infraLevel=Math.max(0,gs.infraLevel-8);gs.stability-=8;},                                                         display:'-8 Infrastructure, -8 Stability' },
  { name:'Foreign Investment Surge', desc:'Favorable ratings attract foreign capital.',              effect:gs=>{gs.gdpMultiplier+=0.06;gs.workforce.tech+=50000;},                                                                    display:'+6% GDP, +50K Tech Workers' },
  { name:'Brain Drain Wave',         desc:'Skilled workers emigrate for better opportunities.',      effect:gs=>{const l=Math.floor(gs.workforce.tech*0.08);gs.workforce.tech=Math.max(0,gs.workforce.tech-l);gs.stability-=5;},      display:'-8% Tech Workers, -5 Stability' },
  { name:'Tourism Boom',             desc:'International arrivals hit record highs.',                effect:gs=>{gs.gdpMultiplier+=0.04;gs.tradeBalance+=8;},                                                                         display:'+4% GDP, +₱8B Trade Balance' },
  { name:'Trade War',                desc:'Key trading partners impose tariffs on exports.',         effect:gs=>{gs.tradeBalance-=20;gs.gdpMultiplier-=0.03;},                                                                        display:'-₱20B Trade, -3% GDP' },
  { name:'Pandemic',                 desc:'Health crisis disrupts labor markets and supply chains.', effect:gs=>{gs.gdpMultiplier-=0.15;gs.stability-=12;gs.unemploymentExtra+=3;},                                                   display:'-15% GDP, -12 Stability, +3% Unemployment' },
  { name:'Green Energy Revolution',  desc:'Renewable energy drives productivity gains.',             effect:gs=>{gs.techLevel+=4;gs.infraLevel+=3;},                                                                                  display:'+4 Technology, +3 Infrastructure' },
  { name:'Demographic Dividend',     desc:'Young workforce enters the economy at scale.',            effect:gs=>{gs.workingAgePop=Math.floor(gs.workingAgePop*1.03);gs.stability+=4;},                                               display:'+3% Working-Age Pop, +4 Stability' },
  { name:'Stable Year',              desc:'A relatively calm year with no major global shocks.',     effect:()=>{},                                                                                                                    display:'No effect' },
  { name:'Stable Year',              desc:'Global markets remain balanced.',                         effect:()=>{},                                                                                                                    display:'No effect' },
];

// ─────────────────────────────────────────────────────────
// 3. GAME STATE
// ─────────────────────────────────────────────────────────
let gs = {};

function initGameState() {
  gs = {
    year:2025,turn:0,
    totalPop:120000000,workingAgePop:0,laborForce:0,
    workforce:{},
    gdp:0,prevGdp:0,gdpGrowthRate:0,gdpMultiplier:1.0,
    budget:600,debt:40,tradeBalance:-10,unemploymentExtra:0,
    eduLevel:30,infraLevel:25,techLevel:20,stability:60,
    score:0,negGdpYears:0,gameOver:false,history:[],
  };
  gs.workingAgePop = Math.floor(gs.totalPop*0.65);
  gs.laborForce    = Math.floor(gs.workingAgePop*0.60);
  CONSTANTS.INDUSTRIES.forEach(ind=>{
    gs.workforce[ind.id]=Math.floor(gs.laborForce*(ind.defaultPct/100));
  });
  gs.gdp=calcGDP(); gs.prevGdp=gs.gdp;
  gs.budget=gs.gdp*CONSTANTS.TAX_RATE;
  gs.score=calcScore();
}

// ─────────────────────────────────────────────────────────
// 4. GDP
// ─────────────────────────────────────────────────────────
function calcGDP() {
  const prodMult=1+gs.eduLevel*CONSTANTS.EDU_PROD_MOD+gs.infraLevel*CONSTANTS.INFRA_PROD_MOD+gs.techLevel*CONSTANTS.TECH_PROD_MOD;
  let total=0;
  CONSTANTS.INDUSTRIES.forEach(ind=>{
    total+=(gs.workforce[ind.id]||0)/1000000*ind.gdpPerWorkerM*prodMult;
  });
  return Math.max(0,total*gs.gdpMultiplier+gs.tradeBalance*0.3);
}

// ─────────────────────────────────────────────────────────
// 5. SCORE
// ─────────────────────────────────────────────────────────
function calcScore() {
  return Math.min(100,Math.max(0,
    Math.min(40,(gs.gdp*1e9/gs.totalPop)/750)+
    (gs.eduLevel+gs.infraLevel+gs.techLevel)/7.5+
    Math.min(10,Math.max(0,(gs.tradeBalance+50)/10))+
    gs.stability/10
  ));
}

// ─────────────────────────────────────────────────────────
// 6. UNEMPLOYMENT
// ─────────────────────────────────────────────────────────
function calcUnemployment() {
  const employed=Object.values(gs.workforce).reduce((a,b)=>a+b,0);
  const rate=((Math.max(0,gs.laborForce-employed)/gs.laborForce)*100)+gs.unemploymentExtra;
  return {employed,unemployed:Math.max(0,gs.laborForce-employed),rate:Math.min(100,rate)};
}

// ─────────────────────────────────────────────────────────
// 7. DIMINISHING RETURNS
// ─────────────────────────────────────────────────────────
function diminish(level){return Math.max(0.05,1-(level/120));}

// ─────────────────────────────────────────────────────────
// 8. NUMBER FORMATTERS
//
//  fmtPeople — for raw head counts (population, workers)
//    120,000,000   → "120.0M"
//    999,000,000   → "999.0M"
//    1,000,000,000 → "1.00B"
//    2,500,000,000 → "2.50B"
//
//  fmtGDP — for GDP numbers already expressed in ₱ Billions
//    800   → "800.0B"
//    1,500 → "1.50T"
// ─────────────────────────────────────────────────────────
function fmtPeople(n) {
  if (n >= 1000000000) return (n/1000000000).toFixed(2)+'B';
  if (n >= 1000000)    return (n/1000000).toFixed(1)+'M';
  if (n >= 1000)       return (n/1000).toFixed(1)+'K';
  return String(Math.round(n));
}

function fmtGDP(n) {
  if (n >= 1000) return (n/1000).toFixed(2)+'T';
  return n.toFixed(1)+'B';
}

// ─────────────────────────────────────────────────────────
// 9. READ PLAYER INPUTS
// ─────────────────────────────────────────────────────────
function readPlayerInputs() {
  const eduInvest   = +document.getElementById('sl-edu').value;
  const infraInvest = +document.getElementById('sl-infra').value;
  const techInvest  = +document.getElementById('sl-tech').value;
  const exportDrive = +document.getElementById('sl-export').value;
  const govSpend    = +document.getElementById('sl-gov').value;
  const totalInvest = eduInvest+infraInvest+techInvest;

  gs.eduLevel   = Math.min(100,Math.max(0,gs.eduLevel   -CONSTANTS.LEVEL_DECAY+eduInvest  *CONSTANTS.EDU_GAIN_PER_B  *diminish(gs.eduLevel)));
  gs.infraLevel = Math.min(100,Math.max(0,gs.infraLevel -CONSTANTS.LEVEL_DECAY+infraInvest*CONSTANTS.INFRA_GAIN_PER_B*diminish(gs.infraLevel)));
  gs.techLevel  = Math.min(100,Math.max(0,gs.techLevel  -CONSTANTS.LEVEL_DECAY+techInvest *CONSTANTS.TECH_GAIN_PER_B *diminish(gs.techLevel)));

  gs.tradeBalance = (exportDrive/100)*gs.gdp*CONSTANTS.EXPORT_GDP_FACTOR*1000 - gs.gdp*CONSTANTS.IMPORT_DRAG*1000;

  const taxRevenue = gs.gdp*CONSTANTS.TAX_RATE;
  const spending   = taxRevenue*(govSpend/100)+totalInvest;
  const surplus    = taxRevenue-spending;
  gs.budget       += surplus;

  if(surplus<0){ gs.debt=Math.min(200,gs.debt+(-surplus/gs.gdp)*100); }
  else         { gs.debt=Math.max(0, gs.debt-(surplus/gs.gdp)*80); }

  const {rate:unempRate}=calcUnemployment();
  gs.stability=Math.max(0,Math.min(100,
    gs.stability
    -(gs.debt>80?(gs.debt-80)*0.1:0)
    -(unempRate>15?(unempRate-15)*0.3:0)
    +(surplus>0?1:-1)
  ));

  const total=readWorkforceSliders();
  return {eduInvest,infraInvest,techInvest,exportDrive,govSpend,totalInvest,surplus,unempRate,total};
}

// ─────────────────────────────────────────────────────────
// 10. WORKFORCE SLIDERS
// ─────────────────────────────────────────────────────────
function readWorkforceSliders() {
  let total=0;
  CONSTANTS.INDUSTRIES.forEach(ind=>{
    const el=document.getElementById('wf-'+ind.id);
    if(el){const pct=+el.value;total+=pct;gs.workforce[ind.id]=Math.floor(gs.laborForce*(pct/100));}
  });
  const warn=document.getElementById('alloc-warning');
  if(Math.abs(total-100)>1){
    warn.classList.remove('hidden');
    const diff=100-total;
    gs.workforce['svc']=Math.floor(gs.laborForce*((+document.getElementById('wf-svc').value+diff)/100));
  } else { warn.classList.add('hidden'); }
  return total;
}

// ─────────────────────────────────────────────────────────
// 11. PICK EVENT
// ─────────────────────────────────────────────────────────
function pickEvent(){return WORLD_EVENTS[Math.floor(Math.random()*WORLD_EVENTS.length)];}

// ─────────────────────────────────────────────────────────
// 12. MAIN GAME LOOP
// ─────────────────────────────────────────────────────────
function nextYear() {
  if(gs.gameOver) return;
  gs.turn++; gs.year++;
  gs.gdpMultiplier=1.0; gs.unemploymentExtra=0;

  const inputs=readPlayerInputs();
  const event=pickEvent();
  event.effect(gs);
  updateEventBox(event);

  gs.totalPop      = Math.floor(gs.totalPop*(1+CONSTANTS.POP_GROWTH_RATE));
  gs.workingAgePop = Math.floor(gs.totalPop*0.65);
  gs.laborForce    = Math.floor(gs.workingAgePop*0.60);

  gs.prevGdp       = gs.gdp;
  gs.gdp           = calcGDP();
  gs.gdpGrowthRate = gs.prevGdp>0?((gs.gdp-gs.prevGdp)/gs.prevGdp)*100:0;
  gs.budget        = gs.gdp*CONSTANTS.TAX_RATE+(inputs.surplus||0);
  gs.score         = calcScore();
  gs.negGdpYears   = gs.gdp<gs.prevGdp ? gs.negGdpYears+1 : 0;

  const emp=calcUnemployment();
  buildReport(emp,inputs,event);
  addHistoryEntry(emp);
  renderAll(emp);
  checkEndConditions(emp);
}

// ─────────────────────────────────────────────────────────
// 13. WIN / LOSE
// ─────────────────────────────────────────────────────────
function checkEndConditions(emp) {
  if(gs.score>=CONSTANTS.MAX_SCORE_WIN){endGame(true,'🏆 Global Competitive Leader!',`In ${gs.year}, the Philippines reached a Competitiveness Score of ${gs.score.toFixed(1)} — surpassing 85. GDP is ₱${gs.gdp.toFixed(0)}B. Outstanding leadership!`);return;}
  if(emp.rate>CONSTANTS.UNEMP_LOSE)   {endGame(false,'💀 Unemployment Crisis',`Unemployment hit ${emp.rate.toFixed(1)}%. Social collapse triggered. The economy has failed its people.`);return;}
  if(gs.debt>CONSTANTS.DEBT_LOSE)     {endGame(false,'🏚️ Sovereign Debt Crisis',`Debt reached ${gs.debt.toFixed(1)}% of GDP. Creditors have pulled out. The nation is bankrupt.`);return;}
  if(gs.negGdpYears>=CONSTANTS.NEG_GDP_LOSE){endGame(false,'📉 Economic Depression',`GDP declined ${gs.negGdpYears} years in a row. The economy is in freefall.`);return;}
}

function endGame(win,title,body) {
  gs.gameOver=true;
  document.getElementById('modal-icon').textContent  = win?'🏆':'💀';
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  document.getElementById('modal-btn').textContent   = win?'PLAY AGAIN':'TRY AGAIN';
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function resetGame() {
  document.getElementById('modal-overlay').classList.add('hidden');
  initGameState();
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
  document.getElementById('bar-edu').style.width    = '16%';
  document.getElementById('bar-infra').style.width  = '13%';
  document.getElementById('bar-tech').style.width   = '8%';
  CONSTANTS.INDUSTRIES.forEach(ind=>{
    const el=document.getElementById('wf-'+ind.id);
    if(el){el.value=ind.defaultPct;document.getElementById('wfval-'+ind.id).textContent=ind.defaultPct+'%';}
  });
  document.getElementById('report-content').innerHTML='<p class="report-placeholder">Your annual economic summary will appear here after each turn.</p>';
  document.getElementById('log-list').innerHTML='';
  document.getElementById('event-name').textContent='—';
  document.getElementById('event-desc').textContent='Press "Advance Year" to start simulation.';
  document.getElementById('event-effect').textContent='';
  renderAll(calcUnemployment());
}

// ─────────────────────────────────────────────────────────
// 14. RENDER ALL
// ─────────────────────────────────────────────────────────
function renderAll(emp) {
  document.getElementById('hdr-year').textContent    = gs.year;
  document.getElementById('hdr-gdp').textContent     = '₱'+fmtGDP(gs.gdp);
  document.getElementById('hdr-score').textContent   = gs.score.toFixed(1);
  document.getElementById('year-display').textContent = gs.year;

  const statusEl=document.getElementById('hdr-status');
  const chip=document.getElementById('hdr-status-chip');
  let status='STABLE',chipColor='var(--green)';
  if(gs.stability<30||emp.rate>20||gs.debt>100){status='CRISIS';chipColor='var(--red)';}
  else if(gs.stability<50||emp.rate>15||gs.debt>70){status='AT RISK';chipColor='var(--amber)';}
  statusEl.textContent=status;
  chip.style.borderColor=chipColor;
  chip.style.background=chipColor+'22';
  statusEl.style.color=chipColor;

  // Population and workforce use fmtPeople (raw head counts)
  document.getElementById('kpi-pop').textContent    = fmtPeople(gs.totalPop);
  document.getElementById('kpi-emp').textContent    = fmtPeople(emp.employed);
  document.getElementById('kpi-unemp').textContent  = emp.rate.toFixed(1)+'%';
  // GDP and budget use fmtGDP (already in ₱ Billions)
  document.getElementById('kpi-gdp').textContent    = '₱'+fmtGDP(gs.gdp);
  document.getElementById('kpi-budget').textContent = '₱'+fmtGDP(gs.budget);
  document.getElementById('kpi-debt').textContent   = gs.debt.toFixed(1)+'%';
  document.getElementById('kpi-trade').textContent  = (gs.tradeBalance>=0?'+':'')+'₱'+gs.tradeBalance.toFixed(1)+'B';
  document.getElementById('kpi-negyr').textContent  = gs.negGdpYears+' / '+CONSTANTS.NEG_GDP_LOSE;

  const debtEl=document.getElementById('kpi-debt');
  debtEl.style.color=gs.debt>100?'var(--red)':gs.debt>60?'var(--amber)':'var(--green)';

  updateLevelBar('edu',  gs.eduLevel);
  updateLevelBar('infra',gs.infraLevel);
  updateLevelBar('tech', gs.techLevel);
  updateLevelBar('stab', gs.stability);
  updateLevelBadge('lv-edu',  gs.eduLevel);
  updateLevelBadge('lv-infra',gs.infraLevel);
  updateLevelBadge('lv-tech', gs.techLevel);

  const arc=document.getElementById('score-arc');
  arc.style.strokeDashoffset=213.5-(gs.score/100)*213.5;
  document.getElementById('score-ring-text').textContent=Math.round(gs.score);
  arc.style.stroke=gs.score>=85?'var(--green)':gs.score>=55?'var(--cyan)':gs.score>=35?'var(--amber)':'var(--red)';
}

function updateLevelBar(key,val){
  const f=document.getElementById('lvbar-'+key);
  const n=document.getElementById('lvnum-'+key);
  if(f)f.style.width=Math.min(100,val)+'%';
  if(n)n.textContent=Math.round(val);
}
function updateLevelBadge(id,val){
  const el=document.getElementById(id);
  if(el)el.textContent='LV'+Math.floor(val/20);
}

// ─────────────────────────────────────────────────────────
// 15. ANNUAL REPORT
// ─────────────────────────────────────────────────────────
function buildReport(emp,inputs,event) {
  const g=gs.gdpGrowthRate;
  const lines=[
    {cls:'head',txt:`📅 Year ${gs.year} — Annual Economic Report`},
    {cls:g>=0?'good':'bad',    txt:`GDP: ₱${gs.gdp.toFixed(1)}B (${g>=0?'+':''}${g.toFixed(2)}% vs last year)`},
    {cls:emp.rate>20?'bad':emp.rate>12?'note':'good', txt:`Unemployment: ${emp.rate.toFixed(1)}% (${fmtPeople(emp.employed)} employed)`},
    {cls:gs.debt>100?'bad':gs.debt>60?'note':'good',  txt:`Debt: ${gs.debt.toFixed(1)}% of GDP`},
    {cls:gs.tradeBalance>=0?'good':'note',             txt:`Trade Balance: ${gs.tradeBalance>=0?'+':''}₱${gs.tradeBalance.toFixed(1)}B`},
    {cls:'note',txt:`Budget Surplus/Deficit: ${inputs.surplus>=0?'+':''}₱${(inputs.surplus||0).toFixed(1)}B`},
    {cls:'note',txt:`World Event: ${event.name} → ${event.display}`},
    {cls:'note',txt:`Competitiveness Score: ${gs.score.toFixed(1)} / 100`},
    {cls:gs.score>=85?'good':gs.score>=55?'note':'bad',
     txt:gs.score>=85?'🏆 WIN CONDITION MET!':gs.score>=70?'📈 Close to winning — keep investing!':gs.score>=50?'⚙️ Mid-tier economy — push harder.':'⚠️ Low competitiveness — urgent action needed!'},
  ];
  document.getElementById('report-content').innerHTML=lines.map(l=>`<div class="report-line ${l.cls}">${l.txt}</div>`).join('');
}

// ─────────────────────────────────────────────────────────
// 16. HISTORY LOG
// ─────────────────────────────────────────────────────────
function addHistoryEntry(emp) {
  gs.history.unshift({year:gs.year,gdp:gs.gdp,score:gs.score,unemp:emp.rate,debt:gs.debt});
  document.getElementById('log-list').innerHTML=gs.history.slice(0,15).map(h=>
    `<div class="log-entry"><span class="log-year">${h.year}</span><span>GDP ₱${h.gdp.toFixed(0)}B | Score ${h.score.toFixed(0)} | Unemp ${h.unemp.toFixed(1)}% | Debt ${h.debt.toFixed(0)}%</span></div>`
  ).join('');
}

// ─────────────────────────────────────────────────────────
// 17. EVENT BOX
// ─────────────────────────────────────────────────────────
function updateEventBox(event) {
  document.getElementById('event-name').textContent  =event.name;
  document.getElementById('event-desc').textContent  =event.desc;
  document.getElementById('event-effect').textContent='→ '+event.display;
}

// ─────────────────────────────────────────────────────────
// 18. SLIDER HELPERS
// ─────────────────────────────────────────────────────────
function updateSliderLabel(sliderId,labelId) {
  const val=document.getElementById(sliderId).value;
  document.getElementById(labelId).textContent=val;
  const barMap={'sl-edu':'bar-edu','sl-infra':'bar-infra','sl-tech':'bar-tech'};
  const barId=barMap[sliderId];
  if(barId){const max=+document.getElementById(sliderId).max;document.getElementById(barId).style.width=(val/max*100)+'%';}
}

function updateIndLabel(indId) {
  document.getElementById('wfval-'+indId).textContent=document.getElementById('wf-'+indId).value+'%';
}

// ─────────────────────────────────────────────────────────
// 19. BUILD INDUSTRY SLIDERS
// ─────────────────────────────────────────────────────────
const INDUSTRY_TIPS = {
  agri: 'Agriculture: ₱4.5B per million workers. High employment but low output. Great for keeping unemployment low early game. Reduce allocation as Tech level grows and you can afford to shift workers.',
  mfg:  'Manufacturing: ₱12B per million workers. Your mid-game engine. Responds well to high Infrastructure levels. Aim for 15–25% throughout the game.',
  svc:  'Services: ₱9B per million workers. Your largest default sector and safety net. Any unallocated labor auto-flows here. Keep at 25–35%.',
  tech: 'Technology: ₱28B per million workers — the HIGHEST output! This is your WIN CONDITION. Invest heavily in Tech Level first, then shift workers here. Target 15–25% once Tech Level exceeds 40.',
  gov:  'Government: ₱5B per million workers. Anchors national stability. Keep between 5–10%. Too low = instability spike. Too high = wasted high-productivity slots.',
  edu:  'Education sector: ₱4B per million workers. Supports your Education Level growth passively. A 3–7% allocation is fine — the Education INVESTMENT SLIDER matters far more.',
  infra:'Infrastructure workers: ₱7B per million workers. Rebuilds national infrastructure capacity. Increase to 5–8% the year after a Natural Disaster event. Otherwise 2–4% is typical.',
};

function buildIndustrySliders() {
  const container=document.getElementById('industry-sliders');
  container.innerHTML=CONSTANTS.INDUSTRIES.map(ind=>`
    <div class="ind-slider-row" data-tip="${INDUSTRY_TIPS[ind.id]||''}">
      <span class="ind-label">${ind.name}</span>
      <input type="range" min="0" max="80" value="${ind.defaultPct}" id="wf-${ind.id}" oninput="updateIndLabel('${ind.id}')" style="accent-color:${ind.color};" />
      <span class="ind-val" id="wfval-${ind.id}">${ind.defaultPct}%</span>
    </div>`
  ).join('');
}

// ─────────────────────────────────────────────────────────
// 20. SECTION TOOLTIPS
//     Rich contextual help on every major panel block
// ─────────────────────────────────────────────────────────
function applyInlineTips() {
  const tips = {
    'tip-human-capital':
      '🧠 HUMAN CAPITAL — Three national capability levels (each 0–100).\n\n' +
      '🎓 Education → multiplies productivity for EVERY worker across ALL industries. The most important long-term investment.\n\n' +
      '🏗️ Infrastructure → reduces economic drag. Critical for Manufacturing, Agriculture, and Trade.\n\n' +
      '💡 Technology → highest GDP multiplier. Essential to make Technology industry workers earn ₱28B/M.\n\n' +
      'HOW LEVELS WORK: Invest ₱B/year → level rises. Stop investing → level decays 0.8/year. Gains diminish at high levels.\n\n' +
      '💡 TIP: Never cut all three to zero at once, even in crisis years.',

    'tip-workforce':
      '👷 WORKFORCE ALLOCATION — How to split your labor force across 7 industries.\n\n' +
      'HOW IT WORKS: Your total labor force (60% of working-age population) is divided by the percentages you set. Workers produce GDP = workers × industry rate × national productivity multiplier.\n\n' +
      '⚠️ TOTAL MUST = 100%: Any shortfall auto-corrects to Services — but this can distort your strategy.\n\n' +
      '⚠️ UNEMPLOYMENT DANGER: If sliders total less than 100% AND many workers are unallocated, unemployment rises. Above 25% → GAME OVER.\n\n' +
      '💡 STRATEGY: Start heavy in Agriculture + Services (employment base), then shift toward Technology as your Tech Level grows past 40.',

    'tip-trade-fiscal':
      '🌍 TRADE & FISCAL — Two levers controlling money flows.\n\n' +
      '📤 EXPORT DRIVE (0–100):\n' +
      '• Higher = more export income, better trade balance\n' +
      '• Risk: Trade Wars and Recessions hurt more\n' +
      '• 50–70 is a safe starting range\n\n' +
      '💰 GOVERNMENT SPENDING (% of budget):\n' +
      '• Higher % → better stability, more public services\n' +
      '• Lower % → more surplus, faster debt paydown\n' +
      '• ⚠️ Keep Debt below 80% GDP (safe zone). Above 150% → GAME OVER.\n\n' +
      '💡 TIP: During Recession years, LOWER gov spending % to prevent a deficit spiral.',

    'tip-national-levels':
      '📡 NATIONAL LEVELS — Live progress bars for your 4 key indices.\n\n' +
      '🔵 Education: Multiplies all worker productivity. Build to 60–80 to win.\n' +
      '🟠 Infrastructure: Physical backbone. Collapses after Natural Disasters — rebuild fast.\n' +
      '🟢 Technology: Most critical for Competitiveness Score. Push to 60+ to win.\n' +
      '🟣 Stability: Social cohesion. Falls with high unemployment or debt. If it hits 0 → crisis deepens.\n\n' +
      'LV badge = tier (LV0–LV4, every 20 points). LV3+ is where multipliers get powerful.\n\n' +
      '💡 TIP: These update AFTER you press ▶ Advance Year — plan a year ahead!',
  };

  Object.entries(tips).forEach(([id,tip])=>{
    const el=document.getElementById(id);
    if(el) el.dataset.tip=tip;
  });
}

// ─────────────────────────────────────────────────────────
// 21. TOOLTIP ENGINE
// ─────────────────────────────────────────────────────────
function initTooltips() {
  const box=document.getElementById('tooltip-box');
  if(!box) return;
  let hideTimer=null;

  function showTip(text,cx,cy) {
    clearTimeout(hideTimer);
    box.innerHTML=text.replace(/\n/g,'<br>');
    box.classList.add('visible');
    placeTip(cx,cy);
  }

  function placeTip(cx,cy) {
    const pad=16, bw=Math.min(box.offsetWidth||280,280), bh=box.offsetHeight||100;
    let x=cx+pad, y=cy+pad;
    if(x+bw>window.innerWidth-8)  x=cx-bw-pad;
    if(y+bh>window.innerHeight-8) y=cy-bh-pad;
    box.style.left=Math.max(8,x)+'px';
    box.style.top =Math.max(8,y)+'px';
  }

  function hideTip() {
    clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>box.classList.remove('visible'),120);
  }

  document.addEventListener('mouseover',e=>{
    const el=e.target.closest('[data-tip]');
    if(el&&el.dataset.tip&&el.dataset.tip.trim()) showTip(el.dataset.tip,e.clientX,e.clientY);
  });
  document.addEventListener('mousemove',e=>{
    if(box.classList.contains('visible')) placeTip(e.clientX,e.clientY);
  });
  document.addEventListener('mouseout',e=>{
    if(e.target.closest('[data-tip]')) hideTip();
  });
  // Mobile: tap to toggle
  document.addEventListener('touchstart',e=>{
    const el=e.target.closest('[data-tip]');
    if(el&&el.dataset.tip&&el.dataset.tip.trim()){
      const t=e.touches[0];
      showTip(el.dataset.tip,t.clientX,t.clientY);
    } else { hideTip(); }
  },{passive:true});
}

// ─────────────────────────────────────────────────────────
// 22. GUIDE MODAL
// ─────────────────────────────────────────────────────────
function openGuide() {
  document.getElementById('guide-overlay').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function closeGuide() {
  document.getElementById('guide-overlay').classList.add('hidden');
  document.body.style.overflow='';
}

function showTab(tabId,btn) {
  document.querySelectorAll('.guide-tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.gtab').forEach(t=>t.classList.remove('active'));
  const tab=document.getElementById('tab-'+tabId);
  if(tab) tab.classList.add('active');
  if(btn) btn.classList.add('active');
}

// ─────────────────────────────────────────────────────────
// 23. STARTUP
//     All DOM wiring inside DOMContentLoaded.
//     Globals exposed at the end so inline onclick="" works.
// ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  buildIndustrySliders();
  applyInlineTips();
  initTooltips();
  initGameState();
  renderAll(calcUnemployment());

  document.getElementById('bar-edu').style.width   ='16%';
  document.getElementById('bar-infra').style.width ='13%';
  document.getElementById('bar-tech').style.width  ='8%';

  // Close guide on backdrop click
  const overlay=document.getElementById('guide-overlay');
  if(overlay) overlay.addEventListener('click',e=>{if(e.target===overlay)closeGuide();});

  // Expose all functions inline onclick="" attributes need
  Object.assign(window,{
    nextYear, resetGame, openGuide, closeGuide, showTab,
    updateSliderLabel, updateIndLabel,
  });

  console.log('🌏 Geo-Economics Simulator loaded.');
});
