# C74 Airdrop Snapshot tool

Read-only tooling to model the C74 community airdrop **before** any tokenomics
or on-chain decisions. Nothing here writes to the DB or touches a chain.

## Usage

Run `c74-airdrop-snapshot.sql` against the Supabase project (SQL editor, `psql`,
or MCP `execute_sql`) and export the result to CSV/JSON:

```bash
psql "$SUPABASE_DB_URL" -f scripts/c74-airdrop-snapshot.sql --csv > c74-airdrop-snapshot.csv
```

Each row = one user (pseudonymous `anon_id`) with: C74 energy, reputation,
VIP level, account age, total wager, referral activity, KYC, eligibility, the
**proposed C74 allocation**, and the weight/formula behind it.

## Parameters (edit in the SQL)

- `pool` — community-airdrop tokens. Default `100,000,000` (10% of 1B supply).
- **Formula v1:** `weight = energy·1 + reputation·10 + wager·5 + referrals·50 + vip·100`
- **Eligibility:** not quarantined AND (energy>0 OR wager>0 OR reputation≥100 OR age≥1d)
- `allocation = pool · weight / Σ(weight over eligible users)`

## First-run findings (2026-08-05, 80 users)

| Metric | Value |
|---|---|
| Users / eligible | 80 / 80 |
| Total C74 energy | 13,137 |
| Avg reputation | 166 |
| Total wagered | **$22.40** (all users) |
| Top allocation | 2,832,872 C74 |
| Min allocation | 703,607 C74 |

**Key insight — the distribution is nearly flat.** With almost no wagering yet
($22 total across the platform), the formula is dominated by reputation, which
is itself dominated by *account age* + *good standing* — so an unused day-old
account scores close to an active one. Before locking tokenomics we should:

1. **Weight real engagement higher** (energy, wager, mining streak) vs passive
   age, so genuine players out-earn dormant sign-ups.
2. **Add sybil / fair-play gates** (KYC threshold for large tiers, per-wallet cap).
3. **Re-run after more wagering data** accrues — the snapshot is only as
   meaningful as the activity it measures.

That tuning is exactly what the **airdrop simulator** (next step) is for: sweep
the weights and caps against this dataset and compare distributions before
anything goes on-chain.

---

# C74 Airdrop Simulator

`c74-airdrop-simulator.py` sweeps allocation formulas + caps over the snapshot
JSON so tokenomics can be tuned on real data. Offline maths only.

```bash
python3 scripts/c74-airdrop-simulator.py c74-airdrop-snapshot.json --pool 100000000
```

Prints a comparison (top / median / gini / top-10 share / engaged-vs-dormant),
and writes per-scenario allocation CSVs + `c74-sim-comparison.json`.

## First-run findings (80 users, 100M pool)

| Scenario | Top | Median | Gini | Top-10 % | Engaged÷Dormant |
|---|---:|---:|---:|---:|---:|
| A Baseline v1 (rep-heavy) | 2.83M | 1.18M | 0.18 | 22% | 1.9× |
| B Engagement-weighted | 7.58M | 0.21M | 0.72 | 69% | 37× |
| C Engagement + active-only + 3% cap | 3.0M | 3.0M | 0.00 | 30% | 1.0 |
| D Sqrt-dampened + active-only + cap | 3.0M | 3.0M | 0.00 | 30% | 1.0 |

**Conclusion:** the active base is small — only **19 of 80** users have any
energy/wager. So the 10% (100M) community pool is **too large to distribute
fairly today** (C/D cap out at 19×3M = 57M, leaving 43M unallocatable). The
baseline (A) is unfairly flat (active earn ~1.9× dormant); pure engagement (B)
over-concentrates (69% to top 10).

**Recommended direction:** make the airdrop a **retroactive + ongoing claim
pool** that fills as users engage post-launch, rather than a one-shot snapshot
distribution — or cut the initial airdrop % (e.g. 3–5%) and route the rest to
ongoing ecosystem rewards. Re-run once more activity accrues.

---

# Ongoing claim pool model (`--ongoing`)

The one-shot sweep proves the pool is **too large to place fairly today**. The
`--ongoing` mode instead treats the 100M as an **emission budget** that streams
as the base grows, so we can validate the recommended direction on real data:

- A **retroactive** tranche at epoch 0 to snapshot-active users (rewards early play).
- The rest **streams over N epochs**, claimable only by whoever is active that
  epoch, weighted by that epoch's engagement.
- Emission that finds **no eligible demand rolls forward** — never stranded.
- A **per-wallet lifetime cap** stops whales accumulating across epochs.
- Engagement **grows `--growth`/epoch** (dormant users activate + new joiners
  arrive); earned tokens **vest linearly** (`--vest`).

```bash
python3 scripts/c74-airdrop-simulator.py c74-airdrop-snapshot.json --ongoing \
    --epochs 24 --growth 1.20 --retro-pct 0.30 --wallet-cap-pct 0.02 --new-per-epoch 8
```

## Findings (80-user snapshot, 100M pool)

| Scenario | Distributed | Undistributed | Gini | Top-10 % | Existing÷New cohort |
|---|---:|---:|---:|---:|---:|
| Conservative (retro 10%, flat, growth 1.10, cap 1.5%, 36 ep) | **100%** | 0 | 0.58 | 15% | 38 / 62 |
| Default (retro 30%, decay, growth 1.20, cap 2%, 24 ep) | **100%** | 0 | 0.67 | 20% | 56 / 44 |
| Aggressive (retro 25%, decay, growth 1.30, cap 2.5%, 18 ep) | **100%** | 0 | 0.79 | 25% | 56 / 44 |

**Conclusion — the streaming pool solves the one-shot's core failure.** Where a
snapshot distribution left **43M unallocatable** (only 19 active wallets × a 3%
cap), *every* ongoing scenario places **100% of the pool** because unclaimed
emission rolls forward while new engagement keeps arriving. Concentration is a
tunable, not a fate:

- **Wallet-cap %** and **retro %** are the main levers — lower both → flatter
  (gini 0.58, top-10 15%) and broader (62% of the pool reaches *new* post-launch
  players); higher both → faster to early adopters (top-10 25%).
- **~91–96% is vested** by the horizon under a 6-epoch linear vest, so
  circulating supply ramps smoothly rather than unlocking in a cliff.

**Direction to carry into tokenomics:** adopt the ongoing claim pool. Start with
a **small retro tranche (10–30%)** for existing engaged users and **stream the
rest** with a **1.5–2% per-wallet lifetime cap**. Re-run with real post-launch
epoch data (actual monthly wager, activations, joiners) before fixing the final
emission curve and cap — the numbers above use a *modelled* growth trajectory,
not measured flow.
