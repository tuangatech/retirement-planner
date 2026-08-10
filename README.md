# Retirement Planning Simulator

**Retirement Simulator That Shows Its Work**

A privacy-first, Monte Carlo simulation-based retirement planning tool that helps individuals determine if their retirement plan will work. Built with transparency and statistical accuracy in mind, this tool honestly discloses its limitations rather than creating false confidence.

[![CI](https://github.com/tuangatech/retirement-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/tuangatech/retirement-planner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

### 👉 [**Try the live demo**](https://retirement-planner-blond.vercel.app/) — no install, runs entirely in your browser

![Results dashboard](public/screenshot.gif)

---

## 🎯 Product Summary

**"Tell me what you'll have AT retirement, and I'll tell you if it will last."**

This tool focuses exclusively on the retirement phase—no pre-retirement accumulation modeling. Users input their projected retirement balances, and the simulator models whether those assets will sustain them through retirement.

### Key Features

- **🎲 Monte Carlo Simulation** — 10,000 runs with randomized market returns
- **📊 Probabilistic Results** — success rate and outcome distribution (10th/50th/90th percentiles)
- **💰 HSA Integration** — tax-free healthcare coverage, with age-65+ flexibility
- **🏥 Phase-Based Spending** — Go-Go, Slow-Go, and No-Go years
- **💳 Multiple Income Sources** — Social Security (with earnings test), pensions, part-time work, rental
- **🔒 Privacy-First** — no server, no accounts, no tracking; everything runs in your browser
- **💾 Scenario Management** — save and compare scenarios in browser `localStorage`
- **📈 Rich Visualizations** — interactive charts (Recharts)
- **🧾 Exportable & Verifiable** — CSV export plus a JSON bundle checked by `scripts/verify_plan.py`
- **⚠️ Honest Limitations** — mandatory disclosure of what the tool does NOT model

### Target Audience

Early retirees, the FIRE community, and DIY planners who want transparent, statistically honest projections.

### Scope & Limitations

Read this before trusting a number. The app's **Disclosures** tab shows the same list with your own
figures filled in — none of it is buried in a footnote.

**What it models** — US federal taxes for **single** and **married filing jointly** filers ·
**state income tax for 13 states** (the nine with no individual income tax, plus Georgia's
age-tiered retirement exclusion, Virginia's means-tested age deduction, California's
brackets-by-status, credit-based exemption, and surtax, and New York's source-dependent
retirement benefit and benefit-recapture brackets) ·
Social Security (claiming age, COLA, earnings test, provisional-income taxability) ·
RMDs from age 75 · Medicare premiums and IRMAA · pre-Medicare healthcare · HSA (incl. age-65+
flexibility) · pensions, part-time work, and rental income · phase-based spending (Go-Go /
Slow-Go / No-Go) · two active withdrawal strategies — standard priority order and tax-smart
deduction-floor filling (a third, gap-year Roth conversions, is scaffolded but disabled).

**What it deliberately does *not* model** — pre-retirement accumulation · **state income tax for
the other 38 states** (fold your rate into the marginal rate yourself) ·
ACA subsidies for pre-Medicare coverage · **long-term care** (often the largest single retirement
risk) · the survivor's penalty for couples · per-spouse accounts (couples' balances are pooled) ·
variable inflation · dynamic spending guardrails · fat-tail crashes · fees and transaction costs ·
home equity and mortgages · **non-income state and local taxes** (sales, property, excise) — a
no-income-tax state is not necessarily a low-tax state.

**Key simplifications** — one marginal rate above the standard deduction rather than the full
10–37% brackets · long-term capital gains taxed at that same flat rate (no 0/15/20% brackets) ·
fixed life expectancy, not a mortality distribution · all accounts share one market shock per year
(perfectly correlated) · annual returns capped at ±50% · IRMAA estimated by you rather than
derived from MAGI.

Several of these gaps are open, well-scoped contribution opportunities — see
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🛠️ Tech Stack

- **React 19** + **TypeScript 5** — UI and type-safe logic
- **Vite 8** — build tool and dev server (Rolldown bundler)
- **React Router 7** — client-side routing (Landing → Wizard → Results → Scenarios/Compare)
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI primitives) — styling and components
- **Recharts 3** — charts · **Lucide** — icons
- **React Context API** — global state (no Redux)
- **Web Workers** — Monte Carlo runs off the main thread
- **localStorage** — scenario persistence (inputs only, not results)
- **Vitest 4** — unit tests for the calculation engine · **ESLint 9** (flat config) — linting

---

## 🚀 Getting Started

> **Just want to try it?** Use the [**live demo**](https://retirement-planner-blond.vercel.app/) — no setup required. The steps below are only for running it locally.

### Prerequisites

- **Node.js** 20.19+ or 22.12+ (required by Vite 8) and **npm** v10+
- A current evergreen browser with Web Worker support. Vite 8 builds to
  `baseline-widely-available` rather than a fixed target, so there is no pinned minimum version

### Installation

```bash
git clone https://github.com/tuangatech/retirement-planner.git
cd retirement-planner
npm install
npm run dev
```

Then open **http://localhost:5175**.

### Available Scripts

```bash
npm run dev          # Start Vite dev server (hot reload) on port 5175
npm run build        # Type-check + production build to ./dist
npm run preview      # Serve the production build locally
npm test             # Run the Vitest unit-test suite once
npm run test:watch   # Vitest in watch mode (re-runs on change)
npm run lint         # ESLint (flat config); errors block, style nits are warnings
npm run type-check   # TypeScript check, no emit
```

> **Testing:** unit tests (Vitest) cover the pure calculation modules in
> `src/lib/calculations/` — taxes, RMDs, Social Security, HSA, withdrawals, the
> seeded RNG, and the depletion/success metric. They're the fast regression net;
> the JSON export + `verify_plan.py` workflow below is the end-to-end cross-check.
> Test files live next to the code they cover as `*.test.ts`.

---

## ✅ Verifying the Calculations

Every simulation can be independently re-checked against a Python re-implementation of the expected-value formulas.

1. Run a simulation, go to the **Annual Breakdown** tab, and click **JSON** to download `retirement-verification-<yyyymmdd-hhmm>.json` (contains all inputs, settings, and the p10/p50/p90 year-by-year projections).
2. Move that file into the **`scripts/`** folder.
3. Run the verifier (it auto-picks the newest bundle in `scripts/`):

```bash
python3 scripts/verify_plan.py                    # newest bundle, median (p50)
python3 scripts/verify_plan.py --percentile p10   # check the worst-case run
python3 scripts/verify_plan.py --json path/to/file.json --tolerance 0.03
```

It re-derives income, expenses, healthcare premiums/out-of-pocket, taxes, and the cash-flow identity from the inputs, and exits non-zero if any deterministic check fails. Downloaded bundles are git-ignored. See `docs/7-technical-implementation.md` §4.2 for details.

**Comparing a scenario across states:** the [State Tax Comparison
page](https://retirement-planner-blond.vercel.app/state-tax-comparison) calls the real
`calculateTotalTaxes`/`computeStateTaxDetailed` functions directly for one household's income
profile and shows federal + all 13 modeled states' tax side by side, with an expandable breakdown
per state — no simulation, no saved scenario. See
[docs/scenario-tax-comparisons.md](docs/scenario-tax-comparisons.md) for worked examples.

---

## 📦 Project Structure

```
retirement-planner/
├── .github/               # CI workflow, issue/PR templates, Dependabot
├── src/
│   ├── components/        # UI: ui/ (shadcn), common/, wizard/, results/,
│   │                      #     scenarios/, comparison/
│   ├── contexts/          # InputsContext (inputs), ResultsContext (worker + results)
│   ├── lib/
│   │   ├── calculations/  # Calculation engine (see below)
│   │   ├── storage/       # localStorage scenario management
│   │   ├── exportVerification.ts  # JSON verification bundle
│   │   ├── constants.ts   # Default values, RMD table, SS factors
│   │   └── utils.ts, format.ts
│   ├── workers/           # monte-carlo.worker.ts (simulation engine)
│   ├── pages/             # LandingPage, WizardPage, ResultsPage,
│   │                      # ScenariosPage, ComparisonPage, StateTaxComparisonPage
│   ├── types/index.ts     # All TypeScript interfaces
│   ├── App.tsx, main.tsx, index.css
├── scripts/               # verify_plan.py + downloaded verification bundles
├── docs/                  # requirements, system-design, technical-implementation, tax-model
├── public/                # Static assets
├── CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, LICENSE
├── vite.config.ts, tsconfig.json, tailwind.config.js, components.json
└── package.json
```

**Routes:** `/` (landing) → `/wizard/:step` (4-step wizard) → `/results` (5 tabs: Summary, Monte Carlo, Cash Flow, Annual Breakdown, Disclosures); plus `/scenarios`, `/compare`, and `/state-tax-comparison`.

---

## 🧮 Calculation Engine

Located in `src/lib/calculations/` — independent, pure, unit-testable modules:

```
random.ts            Seeded RNG (Mulberry32) + Box-Muller normal returns
rmd.ts               Required Minimum Distributions (IRS Uniform Lifetime Table)
socialSecurity.ts    Claiming-age adjustment, COLA, earnings test
income.ts            Pensions, part-time work, rental income
expenses.ts          Phase-based spending + healthcare (pre-Medicare & Medicare)
taxes.ts             Federal model: provisional-income SS, deduction floor, gross-up
stateTax.ts          State model: per-state formulas, also fed to the withdrawal gross-up
stateTaxRules.json   Per-state constants w/ primary sources (also read by verify_plan.py)
withdrawals.ts       Withdrawal sequencing, RMD enforcement, HSA-first
hsa.ts               HSA tax-advantaged withdrawal logic
yearlyProjection.ts  Orchestrates all modules for one year
```

The `monte-carlo.worker.ts` worker runs 10,000 full simulations and aggregates success rate, percentiles, and the p10/p50/p90 projections. A seeded PRNG makes results reproducible.

**Performance:** 10,000 runs complete in a few seconds.

---

## 🚢 Deployment (Vercel)

The app is a static SPA—no backend or environment variables.

1. Import the GitHub repo into Vercel once. Vercel auto-detects the **Vite** preset and runs the build for you (output `dist`) — you don't build locally.
2. **Every push to `main` triggers a production deploy**; other branches and PRs get preview deploys. That's the whole workflow—just push.

A **`vercel.json`** at the repo root rewrites all paths to `index.html`, so deep links and page refreshes (e.g. `/results`) don't 404 under the app's client-side routing. It's already included—no action needed.

> Building locally is optional — Vercel builds on its servers. If you want to sanity-check a production bundle before pushing, `npm run build` (and `npm run preview`) are available, but they aren't part of the deploy step.

---

## 🔒 Privacy & Data

All calculations run in your browser—**no server, no accounts, no tracking, no cookies**. Scenarios are saved to `localStorage` (inputs only; results are recalculated on load because they're too large to store).

⚠️ Don't use on a shared/public computer—anyone with browser access can view saved scenarios.

Configuration lives in `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, and `components.json`; no `.env` is required.

---

## 📖 Documentation

- **[1-requirements.md](docs/1-requirements.md)** — product requirements
- **[2-federal-tax-model.md](docs/2-federal-tax-model.md)** — federal tax logic, constants/sources
- **[federal-tax-explained.html](docs/federal-tax-explained.html)** — illustrated walkthrough of the federal model: the Social Security provisional-income formula and the resulting "tax torpedo" (open in a browser)
- **[3-withdrawal-strategy.md](docs/3-withdrawal-strategy.md)** — withdrawal order and tax-efficiency suggestions
- **[4-married-filing-jointly.md](docs/4-married-filing-jointly.md)** — married-filing-jointly (couples) model and roadmap
- **[5-state-tax-model.md](docs/5-state-tax-model.md)** — per-state tax model (13 states live incl. GA, VA, CA, and NY), constants and sources
- **[state-tax-explained-georgia.html](docs/state-tax-explained-georgia.html)** — illustrated walkthrough of Georgia's retiree tax rules (open in a browser)
- **[state-tax-explained-virginia.html](docs/state-tax-explained-virginia.html)** — the same for Virginia, incl. the phase-out band that doubles the marginal rate
- **[state-tax-explained-california.html](docs/state-tax-explained-california.html)** — the same for California, incl. the credit-based exemption and the surtax
- **[state-tax-explained-new-york.html](docs/state-tax-explained-new-york.html)** — the same for New York, incl. the source-dependent retirement benefit and the benefit-recapture brackets
- **[scenario-tax-comparisons.md](docs/scenario-tax-comparisons.md)** — worked household scenarios compared across states, reproducible on the [State Tax Comparison page](https://retirement-planner-blond.vercel.app/state-tax-comparison)
- **[6-system-design.md](docs/6-system-design.md)** — architecture and design
- **[7-technical-implementation.md](docs/7-technical-implementation.md)** — implementation guide (incl. verification workflow)

For contributors: **[CONTRIBUTING.md](CONTRIBUTING.md)** ·
**[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** · **[SECURITY.md](SECURITY.md)**

### Key Design Decisions

1. **No pre-retirement modeling** — focuses only on the retirement phase.
2. **Simplified tax model** — single effective rate rather than full brackets.
3. **Mandatory assumptions panel** — honest disclosure of limitations.
4. **localStorage only** — no cloud sync keeps it simple and private.
5. **Web Workers** — keep the UI responsive during 2–10s simulations.

---

## 🤝 Contributing

Contributions are welcome — including from people who don't write code.

- **Use it and report what's wrong.** Run the [live demo](https://retirement-planner-blond.vercel.app/)
  with a plausible plan and file anything confusing or incorrect.
- **Check the math.** Export the JSON bundle and run `python3 scripts/verify_plan.py`. If it
  disagrees with the app, that's a great bug report.
- **Challenge an assumption.** If you know the tax, Medicare, or Social Security rules better than
  the code does, cite the source and we'll fix it or document the simplification.
- **Close a known gap.** ACA subsidies, the survivor's penalty, and a state module for any of the
  remaining 38 unmodeled states are all documented, unbuilt, and well-scoped — see
  `docs/5-state-tax-model.md` for the pattern the first four states followed.

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** first — the engine has hard invariants (seeded RNG,
exactly two `rng()` calls per simulated year, pure calculation modules) that are easy to break by
accident. Issues labeled **`good first issue`** are safe entry points.

> 🔒 **Never post your real financial data in an issue.** Use rounded or synthetic numbers — the
> exported JSON bundle contains every figure you entered.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📝 License

MIT — see [LICENSE](LICENSE).

Educational projections only; not financial, tax, legal, or investment advice. The software is
provided "as is", without warranty of any kind. Consult a qualified professional before making
retirement decisions.

---

**Made with ❤️ for the FIRE community**
