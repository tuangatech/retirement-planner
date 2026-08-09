# Retirement Planning Simulator — Requirements (v1.5)

## 1. EXECUTIVE SUMMARY

A US-focused retirement planning **simulation tool** that models phase-based spending,
multiple income sources, HSA optimization, and probabilistic success via Monte Carlo. It
answers **"Will my retirement plan work?"** using simplified assumptions with transparent
disclosure of limitations.

- **Users:** US individuals and couples planning retirement (single or married-filing-jointly).
- **Philosophy:** Simplified inputs, comprehensive assumptions disclosure.
- **Storage:** Browser localStorage (inputs only; results recomputed on load).
- **Core concept:** "Tell me what you'll have AT retirement, and I'll tell you if it will last."

**Key simplification:** the tool does **not** model pre-retirement saving, contributions, or
accumulation-phase growth. Users provide **projected retirement balances**, and the tool
models the **retirement phase only** (retirement age → life expectancy).

**Companion docs:** [`2-federal-tax-model.md`](2-federal-tax-model.md) (federal tax model + constants),
[`3-withdrawal-strategy.md`](3-withdrawal-strategy.md), [`4-married-filing-jointly.md`](4-married-filing-jointly.md) (couples model),
[`5-state-tax-model.md`](5-state-tax-model.md) (per-state tax model),
[`6-system-design.md`](6-system-design.md), [`7-technical-implementation.md`](7-technical-implementation.md).

---

## 2. USER PROFILE & RETIREMENT TIMELINE

Establishes the timeline and tax context that drive duration and phase transitions.

### 2.1 Personal Information

- **Retirement age** (40–75) — the simulation's starting point. Below 59½ the plan understates
  tax on tax-deferred draws: the 10% early-withdrawal penalty is not modeled, nor are the
  strategies that avoid it (Roth conversion ladder, 72(t)/SEPP, rule of 55). Disclosed in the
  Assumptions panel.
- **Life expectancy** (70–110, default 90) — planning horizon.
- **State** (50 states + DC) — **thirteen states are modeled**: the nine with no individual income
  tax (AK, FL, NH, NV, SD, TN, TX, WA, WY), **Georgia**, **Virginia**, **California**, and
  **New York**. For those, state tax is computed and the marginal rate in Step 4 becomes
  **federal-only**. Every other state is guidance only: fold your state's rate into that marginal
  rate yourself — see [`5-state-tax-model.md`](5-state-tax-model.md).
- **Filing status** — **single** or **married filing jointly**. MFJ reveals spouse age and
  (in Step 2) spouse Social Security. The couples model is specified in [`4-married-filing-jointly.md`](4-married-filing-jointly.md).

All dollar inputs are in **retirement-year dollars**. Retirement duration = `lifeExpectancy − retirementAge`.

### 2.2 Retirement Phases (3)

Spending typically declines with age; the tool models three phases keyed to your age:

1. **Go-Go** (active: travel, hobbies)
2. **Slow-Go** (reduced activity)
3. **No-Go** (limited mobility, more care)

Per phase: **start age** (sequential) and **annual spending** (retirement-year dollars,
inflated forward). Optional **one-time expenses** (0–5 per phase): year, amount, description.
Spending covers everything **except healthcare** (modeled separately in §5).

**Validation:** `retirementAge ≤ phase2 ≤ phase3 ≤ lifeExpectancy`; one-time expenses fall
within phase boundaries.

---

## 3. INVESTMENT ACCOUNTS AT RETIREMENT

Define portfolio composition **at retirement** (no pre-retirement growth modeled). For each
account: **balance at retirement**, **expected annual return** (−10% to +20%), and
**standard deviation** (5–30%, default 17%, Advanced only). Accounts are optional (zero
allowed); multiple accounts of a type are summed into one.

### 3.1 Account Types

1. **Tax-Deferred (Traditional 401k/IRA):** withdrawals taxed as ordinary income; subject to
   RMDs starting **age 75** (SECURE 2.0, born 1960+ — the FIRE audience; see [`2-federal-tax-model.md`](2-federal-tax-model.md)).
2. **Roth (Roth 401k/IRA):** withdrawals tax-free; no RMDs.
3. **Taxable (Brokerage):** only gains taxed on withdrawal; user sets **cost-basis %** (default 70%).
4. **HSA (Health Savings Account):** healthcare withdrawals tax-free at any age; non-medical
   withdrawals after 65 taxed as ordinary income; automatically used for healthcare first.

### 3.2 Return Assumptions

- Per-account mean return; Box-Muller generates normally distributed returns.
- All accounts share **one market shock and one volatility** each year (perfectly correlated);
  only the mean differs per account. No diversification benefit is modeled.
- Returns applied only during retirement years; negative returns possible.

### 3.3 Withdrawal Strategy & Order

Selected on Step 4 ("Assumptions & Strategy", after Tax):

- **Standard order** — strict priority order.
- **Tax-smart sequencing (default)** — each gap year, first draw Tax-Deferred up to the
  standard-deduction floor (≈ tax-free), then follow the priority order. Uses free deduction
  room yearly, shrinking future RMDs and the SS "tax torpedo".
- **Gap-year Roth conversions (Advanced)** — documented, shown as "coming soon", not yet built.

Default priority (also the tax-smart fall-through): **Taxable → Tax-Deferred → Roth**
(user-reorderable). HSA is priority 0 — always used first for healthcare, tax-free.

**Execution order each year:**
1. **HSA for healthcare** (tax-free, any age).
2. **RMD enforcement** (age 75+): forced from Tax-Deferred regardless of priority; excess
   over need reinvested to Taxable. For MFJ, one household RMD triggered by the **older** spouse.
3. **HSA for general expenses** (age 65+, taxed) if any HSA remains.
4. **Tax-smart fill** (if strategy ≠ Standard): draw Tax-Deferred up to the deduction floor,
   accounting for SS provisional-income feedback; RMD already taken counts toward the floor.
5. **Priority sequence** (user order) until need met or accounts depleted.
6. **Depletion handling:** track shortfall; income-only survival after total depletion.

**Tax gross-up:** withdrawals are grossed up to cover their own tax by solving
`gross − tax(gross) = need` against the **real** marginal rate, not a flat one. That rate is not
constant: inside the standard-deduction floor it is 0%, and while Social Security is phasing into
taxation each withdrawn dollar also pulls up to $0.85 of SS into the taxable base, making the true
rate up to **1.85×** the headline rate before it settles back once SS hits its 85% cap.

---

## 4. INCOME SOURCES DURING RETIREMENT

Non-portfolio income reduces withdrawal needs.

### 4.1 Social Security

- **FRA benefit** (monthly at age 67), in retirement-year dollars.
- **Claiming age** 62–70 (default 67): ~70% at 62, 100% at FRA, up to 124% at 70.
- **COLA** (default 3.0%), compounding from claiming year.
- **Earnings test** if claiming before FRA while working (2025 threshold ~$23,400; $1 withheld
  per $2 over; recalculated at FRA, not permanently lost).
- **SS taxable %** (0–85%, default 85%): a **cap** on the IRS provisional-income formula (§6).
  In an unmodeled state, lowering it approximates a state SS exemption; in a **modeled** state
  it is a federal-only cap — the state's SS exemption is already applied, so lowering it would
  exempt the benefit twice.
- **MFJ:** each spouse enters their own benefit + claiming age; the two streams are **summed**
  before the provisional formula. COLA and taxable % are shared household values. See [`4-married-filing-jointly.md`](4-married-filing-jointly.md).

### 4.2 Pensions

0–5 entries: **annual amount**, **start age**, **COLA** (default 0%, 0–5%), and a **government
pension** toggle (default off). Additive; no survivor-benefit modeling. The toggle only affects
tax in New York, whose retiree benefit is split by pension source — see
[`5-state-tax-model.md`](5-state-tax-model.md) §4.5.

### 4.3 Part-Time Work

**Annual income** and **end age**. Subject to income tax **and** payroll tax (7.65% FICA,
separate). Triggers the SS earnings test if claiming before FRA. No inflation adjustment
assumed. (A spouse's own earned income is not modeled — see [`4-married-filing-jointly.md`](4-married-filing-jointly.md).)

### 4.4 Rental Income

**Net annual income** (after expenses) and **end age**; inflated at general inflation. No
property tax/maintenance/vacancy/depreciation or sale capital-gains modeling.

---

## 5. HEALTHCARE COSTS

Often the largest variable expense; modeled per person by age. For MFJ, each spouse is on
their own track — pre-Medicare until their own 65, then Medicare — assuming equal per-person
costs (see [`4-married-filing-jointly.md`](4-married-filing-jointly.md)). All defaults live in `constants.ts` and inflate at the
healthcare rate (default 5%).

### 5.1 Pre-Medicare (age < 65)

**Monthly premium** (ACA/individual) + **annual out-of-pocket**. No ACA subsidy modeling
(a real limitation for early retirees).

### 5.2 Medicare (age ≥ 65)

Part B + Part D + optional **Medigap** + **IRMAA** surcharge (user-estimated monthly, not
computed from MAGI) + out-of-pocket. Part A assumed $0 (40+ quarters).

### 5.3 Phase-Based Out-of-Pocket

Out-of-pocket rises by phase (Go-Go < Slow-Go < No-Go); switches at phase transitions and
inflates at the healthcare rate. HSA covers total healthcare (premiums + OOP) tax-free.

---

## 6. TAX MODELING

Captures the two effects that dominate retiree taxation — **provisional-income taxation of
Social Security** and the **standard-deduction "tax-free floor"** — then applies a single
**marginal** rate above the floor. Full specification, constants (with sources), MFJ details,
and RMD age in [`2-federal-tax-model.md`](2-federal-tax-model.md). **State** income tax is a
separate model with its own constants and annual-review cycle, covering thirteen states today
(§2.1) — see [`5-state-tax-model.md`](5-state-tax-model.md).

### 6.1 Marginal Rate (above the deduction)

- **User rate, default 12%** — a marginal rate on taxable income above the standard deduction
  (not a blended effective rate). Applied to: taxable SS, pensions, work, rental, tax-deferred
  withdrawals, brokerage **gains**, and non-medical HSA withdrawals.
- **SS taxability:** IRS provisional-income formula (0–85%), capped at the user's setting;
  thresholds are frozen (not indexed) — the "tax torpedo".
- **Standard deduction:** base + age-65 addition + 2025–2028 OBBBA senior bonus; base
  inflation-indexed from retirement. For MFJ: joint amounts with **per-spouse** age-65
  additions (senior count 0/1/2).
- **Not taxed:** Roth, HSA-for-healthcare, taxable-account cost basis.

**Guidance (single):** 10–12% for most retirees; 22% when taxable income is well into six
figures. In a **modeled** state this is your federal rate only; otherwise add a few points if
your state actually taxes retirement income.

**Not modeled:** full 10–37% brackets, 0/15/20% capital-gains brackets, and itemized
deductions/credits. State-specific exemptions are modeled for the thirteen states in §2.1 and
approximated by the user's rate everywhere else.

### 6.2 Payroll Tax

7.65% FICA applied **only** to part-time work income; separate from income tax.

### 6.3 Tax Gross-Up

Withdrawals cover their own tax: the engine solves `gross − tax(gross) = need`, iterating to
within $1. Crucially the tax term is the **incremental** tax the draw actually causes — including
the Social Security it drags into taxation and the shielding the deduction floor provides — not
`gross × rate`. A flat rate over-withdraws inside the floor (harmless; the surplus is reinvested)
and **under**-withdraws inside the SS phase-in, which would let a year spend money it never took
out. Applied to Tax-Deferred draws, Taxable **gains**, forced RMDs, and non-medical HSA draws.

---

## 7. SIMULATION SETTINGS

- **Return volatility:** std dev default 17% (5–30%, Advanced). Seeded Mulberry32 PRNG →
  reproducible; all accounts share one shock and one volatility per year.
- **Inflation:** general default 3% (living/one-time/rental/pension COLA); healthcare default
  5% (Advanced). Both compound from retirement start.
- **Runs:** **fixed at 10,000** (not user-selectable) for smooth, reliable percentiles. Runs
  in a Web Worker; progress updates every 100 runs.

---

## 8. OUTPUT & VISUALIZATION

### 8.1 Summary Dashboard

- **Success probability** with color-coded gauge: green ≥90%, yellow 75–89%, orange 50–74%, red <50%.
- **Metric cards:** timeline; starting/median/10th/90th final balances; lifetime totals
  (spending, taxes, healthcare, HSA coverage); critical ages (retirement, Medicare 65, SS
  claiming, RMD start 75, phase transitions); HSA coverage years.

### 8.2 Assumptions & Limitations Panel (MANDATORY)

Honest disclosure sets realistic expectations. Displayed prominently on results:

- **Investment:** normal-distribution returns; one shared market shock (no diversification);
  no fat-tail crashes; no rebalancing.
- **Tax:** single marginal rate above the deduction (not full brackets); SS via provisional
  formula (0–85%, capped); standard deduction modeled (base + age-65 + senior bonus); LTCG at
  the flat rate; IRMAA user-estimated; no itemized deductions/credits.
- **State tax:** computed for the thirteen modeled states, with each one's own caveats named
  (e.g. Georgia's frozen contingent rate cuts, Washington's unmodeled capital-gains excise tax,
  New York's unmodeled NYC/Yonkers local tax); for every other state the panel says plainly that
  state tax is **not** modeled and the user's marginal rate is carrying it.
- **Healthcare:** Medicare base + inflation; out-of-pocket estimated; **long-term care NOT
  modeled** ($50k–150k+/yr); no ACA subsidies; HSA covers healthcare first.
- **Spending:** constant within each phase; no market-based or dynamic adjustments.
- **Mortality / couples:** fixed life expectancy (no distribution); for MFJ, both spouses
  assumed alive to a shared horizon — **the survivor's penalty is not modeled** (see [`4-married-filing-jointly.md`](4-married-filing-jointly.md)).
- **Not modeled:** pre-retirement accumulation, long-term care, actual brackets, dynamic
  spending, estate planning, inflation variability, ACA subsidies, Roth conversions, and state
  tax outside the thirteen modeled states.

**Disclaimer:** educational projections only; not financial, tax, or legal advice.

### 8.3 Visualizations

- **Cash-flow chart:** stacked income (SS, pensions, work, rental, portfolio, HSA) and
  expenses (living, healthcare, taxes, one-time); portfolio-balance line with p10/p50/p90
  bands and HSA balance; event markers (retirement, Medicare 65, SS claiming, RMD 75, phase
  transitions).
- **Monte Carlo chart (simplified 3-line):** p10 / p50 / p90 portfolio trajectories, labeled
  "Worst 10% / Median / Best 10% of Outcomes" (statistical, not assumption, language). *(An
  earlier design drew ~200 faint "spaghetti" paths; the shipped chart uses the three lines.)*
- **Final-balance histogram:** frequency by final balance, color-coded by success/failure.
- **Annual breakdown table:** per-year age, income, expenses, taxes, withdrawals and end
  balances by account (incl. HSA coverage/balance); p10/p50/p90 toggle; CSV + JSON export.

---

## 9. USER INTERFACE & WORKFLOW

### 9.1 Landing Page

Value proposition before the wizard: hero ("The Honest Retirement Calculator"),
differentiators (transparent limitations; Monte Carlo; no signup/tracking, fully private),
and a "Start Planning" CTA into Step 1.

### 9.2 Wizard (4 steps)

Progress indicator, Back/Next with validation, auto-save to localStorage. Four screens, each
merging two of the original seven conceptual steps (§3–§7 above) so related decisions sit
together:

1. **Your Plan** — retirement age, life expectancy, state, filing status (+ spouse age if MFJ);
   phase-based spending, start ages, one-time expenses. *(Merges the former Personal Info and
   Retirement Phases steps.)*
2. **Savings & Income** — account balances/returns (Tax-Deferred, Roth, Taxable, HSA); Social
   Security (+ spouse SS if MFJ), pensions, part-time work, rental income. *(Merges the former
   Investment Accounts and Income Sources steps.)*
3. **Healthcare** — pre-Medicare, Medicare, out-of-pocket by phase.
4. **Assumptions & Strategy** — marginal rate, inflation, (runs fixed at 10,000), withdrawal
   strategy + timeline diagram; **Calculate** → results. *(Merges the former Taxes & Simulation
   and Withdrawal Strategy steps.)*

**Basic/Advanced toggle:** Basic hides a handful of technical settings; Advanced exposes std
dev, healthcare inflation, cost basis %, etc. Defaults suit most users.

### 9.3 Results Dashboard

Summary cards, mandatory Assumptions panel, and tabs (Summary, Monte Carlo, Cash Flow, Annual
Breakdown, Disclosures). Actions: save scenario, export CSV/JSON, modify inputs, compare.

### 9.4 Profile Management

Save/load/delete scenarios (name + **inputs only**; results recomputed on load). Up to ~10
scenarios in localStorage; JSON format.

### 9.5 Responsive Design

Desktop (side-by-side), tablet (stacked), mobile (vertical, collapsible, touch targets ≥44px),
and print (includes assumptions, static charts, no interactive elements).

---

## 10. VALIDATION & ERROR HANDLING

- **Ages:** retirement 40–75; life 70–110 and > retirement age; sequential phases; Medicare 65
  and RMD 75 are automatic (not user input).
- **Amounts:** non-negative (returns may be negative); cost basis 0–100%; rates within range.
- **Logical:** SS claiming 62–70; earnings-test warning when claiming before FRA while working;
  one-time expenses within phase ranges.
- **Calculation checks:** warn on very low portfolio or high withdrawal rate; validate RMDs
  against IRS tables; verify percentile ordering (p10 ≤ p50 ≤ p90); guard tax gross-up
  convergence; balances never negative within a year.
- **External verification:** export a run via the Annual Breakdown "JSON" button and run
  `python3 scripts/verify_plan.py` to independently re-derive income, expenses, healthcare,
  taxes, and the cash-flow identity. See [`7-technical-implementation.md`](7-technical-implementation.md) §4.2.

---

## 11. EDUCATIONAL FEATURES

- **Contextual help / tooltips:** blended return, RMD, SS earnings test, marginal vs effective
  rate, IRMAA, Monte Carlo, success rate, HSA triple tax advantage.
- **FAQ:** where to enter bonds (blended return); **couples support** — yes, choose MFJ in
  Step 1 (models combined SS, the joint deduction, and per-spouse Medicare timing; the
  survivor's penalty and separate per-spouse accounts are not yet modeled — see [`4-married-filing-jointly.md`](4-married-filing-jointly.md));
  part-time + early SS (earnings test); accuracy/limitations; success-rate meaning; why
  balances are entered "at retirement"; how to use an HSA.
- **External resources:** SSA benefits estimator, medicare.gov costs, IRS Pub 590-B (RMDs),
  cfp.net (find a CFP).

---

## 12. TECHNICAL SPECIFICATIONS

- **Stack:** React 19 + TypeScript 5, Vite 8, Tailwind 3 + shadcn/ui, Recharts 3, React Router v7,
  React Context. No form library — inputs are controlled components with HTML-level bounds. No backend.
- **Engine:** pure, unit-tested TypeScript modules in `src/lib/calculations/` (taxes, rmd,
  socialSecurity, income, expenses, withdrawals, hsa, random, stateTax, yearlyProjection); Monte Carlo
  runs in a **Web Worker** (fixed 10,000 runs). Determinism: seeded Mulberry32, 2 `rng()` calls
  per simulated year.
- **Storage/Export:** localStorage (inputs only, JSON); CSV + JSON verification-bundle export.
- **Deployment:** static site on Vercel (Git-based, SPA rewrites). Privacy-first: no server,
  no accounts, no data leaves the browser.
- **Browsers:** modern evergreen (Chrome/Firefox/Safari/Edge); no IE11.

See [`6-system-design.md`](6-system-design.md) and [`7-technical-implementation.md`](7-technical-implementation.md)
for architecture and file-level detail.

---

## 13. FUTURE ENHANCEMENTS

Roughly in priority order (living list; not commitments):

1. **Survivor's penalty & mortality for couples** — first-death transition (MFJ→single,
   deduction/IRMAA drop, smaller SS ends) and probabilistic mortality. Highest-value couples
   gap; see [`4-married-filing-jointly.md`](4-married-filing-jointly.md).
2. **Per-state tax modules (in progress)** — the nine no-income-tax states, Georgia, Virginia,
   and **California** (brackets by filing status, credit-based exemption, Behavioral Health
   Services Tax surtax) have shipped; **NY** is next. See [`5-state-tax-model.md`](5-state-tax-model.md).
3. **Gap-year Roth conversions** — the Advanced withdrawal tier (UI stub exists).
4. **Asset allocation / correlations per account** — stocks/bonds mix and diversification.
5. **Dynamic spending / guardrails** (e.g. Guyton-Klinger).
6. **ACA subsidy modeling** for pre-65 healthcare.
7. **Long-term care modeling** (self-funding or LTC insurance).
8. **Fuller tax modeling** — actual federal brackets, 0/15/20% LTCG.
9. **Per-spouse life expectancy, different retirement dates, separate accounts, spousal SS.**
10. **Legacy/estate goals; smart recommendations.**

---

## 14. ASSUMPTIONS & CONSTRAINTS

**Key assumptions:** users obtain SS estimates from ssa.gov and project balances to retirement;
results are probabilistic, not guarantees; returns are normal (no fat tails); accounts share
one market shock; inflation is constant; spending is constant within a phase.

**Scope constraints:** US-only; single or MFJ (couples modeled per [`4-married-filing-jointly.md`](4-married-filing-jointly.md), no
survivor penalty yet); no pre-retirement accumulation; fixed life expectancy; simplified tax
(marginal rate + deduction floor, no full brackets); no long-term care; state tax for thirteen
states only (§2.1); no ACA subsidies; no Roth conversions yet; no dynamic spending. Client-side only;
localStorage is unencrypted ("don't use on shared computers"); no SSN/account numbers/names required.

**Required disclaimer (results page):** *"Educational projections only. Not financial, tax, or
legal advice. Actual outcomes will vary due to market performance, tax-law changes, healthcare
costs, longevity, and inflation. Past performance does not indicate future results. Consult
qualified professionals (CFP, CPA, attorney) before making decisions."*

---

## 15. GLOSSARY

- **COLA** — Cost of Living Adjustment (annual benefit inflation increase).
- **FRA** — Full Retirement Age (67 for those born 1960+).
- **IRMAA** — Income-Related Monthly Adjustment Amount (Medicare surcharge for high earners).
- **MAGI** — Modified Adjusted Gross Income (used for IRMAA).
- **RMD** — Required Minimum Distribution; modeled starting **age 75** (SECURE 2.0, born 1960+).
- **MFJ** — Married Filing Jointly; the couples model (see [`4-married-filing-jointly.md`](4-married-filing-jointly.md)).
- **Cost Basis** — original taxable-account investment (not taxed on withdrawal).
- **Monte Carlo** — simulation using randomized returns to model uncertainty.
- **Success Rate** — % of simulations where the portfolio lasts to life expectancy.
- **Marginal vs Effective Rate** — rate on the next dollar vs. average rate on all income.
- **Tax Gross-Up** — withdrawing extra to cover the tax on the withdrawal itself.
- **Mulberry32 / Box-Muller** — seeded PRNG / normal-random generator (reproducible runs).
- **Percentile** — statistical rank (p10 = worst 10%, p50 = median, p90 = best 10%).
- **HSA** — Health Savings Account (tax-free in, growth, and healthcare withdrawals; after 65
  like a Traditional IRA for non-medical).

---

**Document version:** 1.9 · **Last updated:** 2026-08-09 · **Status:** implemented, evolving.

**Changes from v1.8:** Wizard consolidated from seven conceptual steps to **four screens**
(§9.2) — Your Plan, Savings & Income, Healthcare, Assumptions & Strategy — each merging two of
the original steps; step-number cross-references elsewhere in this doc (§2.1, §3.3) updated to
match.

**Changes from v1.7:** New York shipped — a source-dependent retirement benefit (government
pensions fully exempt; private pension/annuity/IRA income excluded up to $20,000 per person,
adding a `Pension.isGovernment` flag to the input model) and a benefit-recapture surtax above
$107,650 of combined income, resolved into extra graduated-bracket rows rather than a new schema
field. State income tax is now modeled for **thirteen** states total. See
[`5-state-tax-model.md`](5-state-tax-model.md).

**Changes from v1.6:** Virginia shipped (age deduction, dollar-for-dollar phase-out, graduated
brackets, 2030 deduction cliff — still "specified but unbuilt" as of v1.6, below) and
**California** followed (brackets by filing status, a credit-based personal/senior exemption
with its own phase-out, and the Behavioral Health Services Tax surtax above $1,000,000). State
income tax is now modeled for **twelve** states total. See
[`5-state-tax-model.md`](5-state-tax-model.md).

**Changes from v1.5:** state income tax is now modeled for **ten** states — the nine with no
individual income tax plus **Georgia** (§2.1, §4.1, §6, §8.2, §13, §14). The marginal rate is
federal-only in a modeled state, and the SS taxable-% cap becomes federal-only with it. Virginia
remains specified but unbuilt. See [`5-state-tax-model.md`](5-state-tax-model.md).

**Changes from v1.4:** added married-filing-jointly support and the [`4-married-filing-jointly.md`](4-married-filing-jointly.md)
couples model (§2.1, §4.1, §5, §6, §8.2, §11); RMD start age corrected to 75 (SECURE 2.0);
trimmed technical specs (§12); refreshed future enhancements (§13); removed the one-time
acceptance-criteria checklist; condensed throughout.
