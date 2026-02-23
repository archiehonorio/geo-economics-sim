# 🌏 Geo-Economics Simulator

> A browser-based geopolitical strategy game. Manage a nation's economy, workforce, and global competitiveness — one year at a time.

---

## 📸 Overview

**Geo-Economics Simulator** puts you in charge of the Republic of the Philippines. Each turn represents one year. You allocate budgets, distribute your workforce across industries, and navigate random world events — all in pursuit of building a globally competitive economy.

Built with pure HTML, CSS, and Vanilla JavaScript. No frameworks. No backend. Runs entirely in the browser and deploys for free on GitHub Pages.

---

## 🎮 How to Play

### Goal
Reach a **Competitiveness Score of 85 or higher** before your economy collapses.

### Each Turn (1 Year), You Decide:
- How much to invest in **Education**, **Infrastructure**, and **Technology**
- How to distribute your **Labor Force** across 7 industries
- How aggressive your **Export Drive** is
- What percentage of budget goes to **Government Spending**

Then press **▶ ADVANCE YEAR** to simulate the next 12 months.

### Win Condition
- Competitiveness Score ≥ **85**

### Lose Conditions
| Condition | Threshold |
|---|---|
| Unemployment | > 25% |
| National Debt | > 150% of GDP |
| Consecutive GDP Decline | 3 years in a row |

---

## 📊 Game Systems

### 🧠 Human Capital Levels (0–100)
Three national capability levels that act as productivity multipliers:

| Level | Investment Slider | Effect |
|---|---|---|
| Education | `₱B/year` | Boosts all worker productivity |
| Infrastructure | `₱B/year` | Reduces drag, improves output |
| Technology | `₱B/year` | Highest GDP-per-worker multiplier |

Levels decay slightly each year — you must invest continuously to maintain them. Gains exhibit **diminishing returns** at high levels.

### 👷 Industries
Your labor force is distributed across 7 sectors:

| Industry | GDP/Million Workers | Notes |
|---|---|---|
| 🌾 Agriculture | ₱4.5B | Low productivity, high employment base |
| 🏭 Manufacturing | ₱12B | Strong mid-tier output |
| 🛒 Services | ₱9B | Largest default employer |
| 💻 Technology | ₱28B | Highest output, needs tech investment |
| 🏛️ Government | ₱5B | Stability anchor |
| 🎓 Education | ₱4B | Feeds level growth |
| 🔧 Infrastructure | ₱7B | Supports other industries |

### 🌍 Competitiveness Score
Composite index calculated from:
- **GDP per capita** (up to 40 pts)
- **Education + Infrastructure + Technology levels** (up to 40 pts)
- **Trade Balance** (up to 10 pts)
- **Stability** (up to 10 pts)

### 💸 Fiscal System
- Tax revenue = 20% of GDP per year
- Investment spending reduces the budget and can increase debt
- Running a surplus slowly pays down debt
- Debt above 80% of GDP erodes stability

### 🌐 World Events (Random, 1 per year)
12 possible events that can shake up your economy:

| Event | Impact |
|---|---|
| Global Tech Boom | +8% GDP, +5 Stability |
| Global Recession | -10% GDP, -₱15B Trade |
| Natural Disaster | -8 Infrastructure, -8 Stability |
| Foreign Investment Surge | +6% GDP, +50K Tech Workers |
| Brain Drain Wave | -8% Tech Workers, -5 Stability |
| Tourism Boom | +4% GDP, +₱8B Trade |
| Trade War | -₱20B Trade, -3% GDP |
| Pandemic | -15% GDP, -12 Stability, +3% Unemployment |
| Green Energy Revolution | +4 Technology, +3 Infrastructure |
| Demographic Dividend | +3% Working-Age Population |
| Stable Year (×2) | No effect |

---

## 🗺️ Map

A simplified SVG map of the Philippines is rendered in the left panel. It includes:
- **Luzon** (main island, highlighted)
- **Visayas** (island cluster)
- **Mindanao** (southern island)
- **Palawan** (western island)
- A live **Competitiveness Score ring** overlay that fills as your score improves

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, grid, flexbox, animations) |
| Logic | Vanilla JavaScript (ES6+) |
| Fonts | Google Fonts — Rajdhani + Source Serif 4 |
| Hosting | GitHub Pages (free, static) |

No npm. No build step. No dependencies to install.

---

## 🚀 Deploying to GitHub Pages

### Option A — GitHub Web UI (easiest)

1. Create a new repository at [github.com/new](https://github.com/new)
2. Name it anything (e.g. `geo-economics-sim`)
3. Upload `index.html`, `style.css`, and `script.js` to the root of the repo
4. Go to **Settings → Pages**
5. Under **Source**, select **Deploy from a branch**
6. Choose **main** branch, **/ (root)** folder, and click **Save**
7. Wait ~60 seconds — your game is live at:
   ```
   https://yourusername.github.io/geo-economics-sim
   ```

### Option B — Git CLI

```bash
# Clone your new repo
git clone https://github.com/yourusername/geo-economics-sim.git
cd geo-economics-sim

# Copy the game files into the folder
cp /path/to/index.html .
cp /path/to/style.css .
cp /path/to/script.js .

# Push to GitHub
git add .
git commit -m "Initial release: Geo-Economics Simulator"
git push origin main
```

Then enable GitHub Pages via the Settings tab as described above.

---

## 📁 File Structure

```
geo-economics-sim/
├── index.html   — Game layout and HTML structure
├── style.css    — Visual theme, animations, responsive layout
├── script.js    — All game logic, systems, and constants
└── README.md    — This file
```

---

## 🔧 Customisation

### Change the Starting Country
Open `script.js` and edit the `initGameState()` function. Modify:
- `totalPop` — starting population
- `eduLevel`, `infraLevel`, `techLevel` — starting capability levels
- `debt`, `tradeBalance` — starting fiscal position
- Industry `defaultPct` values in `CONSTANTS.INDUSTRIES`

### Add a New Industry
In `script.js`, add an entry to the `CONSTANTS.INDUSTRIES` array:
```js
{ id: 'mining', name: '⛏️ Mining', gdpPerWorkerM: 15, defaultPct: 3, color: '#b0bec5' }
```
The UI slider will be generated automatically.

### Add a New World Event
Append to the `WORLD_EVENTS` array in `script.js`:
```js
{
  name: 'Remittance Surge',
  desc: 'OFW remittances hit record highs, boosting household spending.',
  effect: (gs) => { gs.gdpMultiplier += 0.05; gs.tradeBalance += 12; },
  display: '+5% GDP, +₱12B Trade Balance'
}
```

---

## 💡 Planned Expansion Ideas

These are documented inside `script.js` and ready to build on top of the existing architecture:

1. **Diplomacy System** — Ally/rival countries with trade bonuses and sanctions
2. **Elections** — Every 6 years, simulate a public vote based on stability and unemployment
3. **Regional Map** — Clickable Luzon/Visayas/Mindanao regions with per-region stats
4. **Technology Tree** — Unlock advanced industries (Semiconductors, AI, Biotech) at level thresholds
5. **Social Indicators** — Health Index, Poverty Rate, Gini Coefficient
6. **Save / Load** — Persist game state using `localStorage`
7. **GDP Charts** — Chart.js line graph showing GDP and Score history
8. **Multiple Countries** — Choose from a roster of countries with different starting profiles
9. **Policy Cards** — One-time strategic actions (e.g. "Build a Tech Hub", "Sign Free Trade Agreement")
10. **Narrative Events** — Branching story choices with meaningful tradeoffs

---

## 📜 License

MIT — free to use, modify, and deploy. Attribution appreciated but not required.

---

## 🙏 Credits

Designed and built as a fully client-side, beginner-friendly geopolitical strategy simulator. Inspired by games like Victoria 3, Democracy 4, and classic nation-builder simulations.

*Made with 🌏 and Vanilla JS.*
