#!/usr/bin/env python3
"""
C74 Airdrop Simulator — offline, read-only.

Two modes over the SAME snapshot (`c74-airdrop-snapshot.sql` → JSON), so
tokenomics can be tuned against real data before anything is decided or deployed.
Pure maths on a local file — no DB, no chain, no writes.

  1. Default (one-shot):  sweep several allocation formulas + caps and compare
     how a single snapshot distribution would land today.
       python3 scripts/c74-airdrop-simulator.py snapshot.json [--pool 100000000]

  2. --ongoing (claim pool): model the airdrop as a *retroactive + ongoing claim
     pool* that emits over many epochs as users engage post-launch, with unspent
     emission rolling forward, a per-wallet lifetime cap, and linear vesting.
     Answers "does a streaming pool distribute fairly where a one-shot can't?"
       python3 scripts/c74-airdrop-simulator.py snapshot.json --ongoing \
           --epochs 24 --growth 1.20 --retro-pct 0.30 --new-per-epoch 8

Outputs (mode 1): a comparison table (stdout) + per-scenario allocation CSVs and
`c74-sim-comparison.json`. (mode 2): a per-epoch schedule (stdout) + summary and
`c74-sim-ongoing.json`, all next to the input file.
"""
import sys, os, json, csv, argparse, random

VIP_IDX = {"Bronze": 0, "Silver": 1, "Gold": 2, "Platinum": 3, "Diamond": 4}


class U:
    def __init__(self, r):
        self.id = r["anon_id"]
        self.energy = float(r["c74_energy"])
        self.rep = float(r["reputation"])
        self.wager = float(r["total_wager"])
        self.refs = float(r["referral_activity"])
        self.vip = VIP_IDX.get(r["vip_level"], 0)
        self.age = float(r["age_days"])
        self.kyc = r.get("kyc_status", "none")


# ── Scenarios: (name, weight_fn, eligible_fn, per_wallet_cap_pct_of_pool) ──────
def w_baseline(u):     return u.energy*1 + u.rep*10 + u.wager*5 + u.refs*50 + u.vip*100
def w_engage(u):       return u.energy*5 + u.wager*100 + u.refs*100 + u.vip*200 + u.rep*1
def w_engage_sqrt(u):  return (u.energy**0.5)*40 + u.wager*60 + u.refs*80 + u.vip*150 + u.rep*1

def elig_any(u):       return (u.energy > 0 or u.wager > 0 or u.rep >= 100 or u.age >= 1)
def elig_active(u):    return (u.energy > 0 or u.wager > 0)   # exclude pure-dormant sign-ups

SCENARIOS = [
    ("A · Baseline v1 (rep-heavy)",        w_baseline,     elig_any,    None),
    ("B · Engagement-weighted",            w_engage,       elig_any,    None),
    ("C · Engagement + active-only + cap", w_engage,       elig_active, 0.03),
    ("D · Sqrt-dampened + active + cap",   w_engage_sqrt,  elig_active, 0.03),
]


def gini(xs):
    xs = sorted(x for x in xs if x is not None)
    n = len(xs)
    if n == 0 or sum(xs) == 0:
        return 0.0
    cum = sum((i + 1) * x for i, x in enumerate(xs))
    return (2 * cum) / (n * sum(xs)) - (n + 1) / n


def run(users, name, wfn, efn, cap_pct, pool):
    elig = [u for u in users if efn(u)]
    weights = {u.id: (wfn(u) if wfn(u) > 0 else 0.0) for u in elig}
    total = sum(weights.values()) or 1.0
    alloc = {uid: pool * w / total for uid, w in weights.items()}

    # per-wallet cap → redistribute overflow proportionally among uncapped users
    if cap_pct:
        cap = pool * cap_pct
        for _ in range(6):
            over = {k: v for k, v in alloc.items() if v > cap}
            if not over:
                break
            overflow = sum(v - cap for v in over.values())
            for k in over:
                alloc[k] = cap
            uncapped = {k: weights[k] for k in alloc if alloc[k] < cap and weights[k] > 0}
            tw = sum(uncapped.values()) or 1.0
            for k in uncapped:
                alloc[k] += overflow * weights[k] / tw

    vals = [round(alloc.get(u.id, 0)) for u in users]
    ev = sorted([alloc[u.id] for u in elig], reverse=True)
    engaged = [alloc[u.id] for u in elig if u.energy >= 500]
    dormant = [alloc[u.id] for u in elig if u.energy == 0]
    med = lambda a: (sorted(a)[len(a)//2] if a else 0)
    top10 = sum(ev[:10])
    return {
        "scenario": name,
        "eligible": len(elig),
        "top": round(ev[0]) if ev else 0,
        "median": round(med(ev)),
        "min": round(ev[-1]) if ev else 0,
        "top10_share_pct": round(100 * top10 / pool, 1),
        "gini": round(gini(ev), 3),
        "engaged_median": round(med(engaged)),
        "dormant_median": round(med(dormant)),
        "engaged_vs_dormant": (round(med(engaged) / med(dormant), 2) if med(dormant) else None),
        "_alloc": {u.id: round(alloc.get(u.id, 0)) for u in users},
    }


def sweep(users, pool, outdir):
    results = [run(users, *s, pool) for s in SCENARIOS]
    cols = ["scenario", "eligible", "top", "median", "min", "top10_share_pct",
            "gini", "engaged_median", "dormant_median", "engaged_vs_dormant"]
    w = [len(c) for c in cols]
    for r in results:
        for i, c in enumerate(cols):
            w[i] = max(w[i], len(f"{r[c]}"))
    line = lambda vals: "  ".join(f"{v:<{w[i]}}" for i, v in enumerate(vals))
    print(f"\nC74 Airdrop Simulator — one-shot · pool {int(pool):,} C74, {len(users)} users\n")
    print(line(cols))
    print("-" * (sum(w) + 2 * (len(cols) - 1)))
    for r in results:
        print(line([r[c] for c in cols]))

    for r in results:
        tag = r["scenario"].split(" ")[0]
        with open(os.path.join(outdir, f"c74-sim-{tag}.csv"), "w", newline="") as f:
            cw = csv.writer(f); cw.writerow(["anon_id", "c74_allocation"])
            for uid, v in sorted(r["_alloc"].items(), key=lambda kv: -kv[1]):
                cw.writerow([uid, v])
        del r["_alloc"]
    json.dump({"pool": pool, "scenarios": results},
              open(os.path.join(outdir, "c74-sim-comparison.json"), "w"), indent=2)
    print("\nWrote per-scenario CSVs + c74-sim-comparison.json")
    print("\nReading: higher engaged_vs_dormant = active players out-earn dormant sign-ups;")
    print("lower gini + lower top10_share = flatter; caps limit whale concentration.")


# ── Ongoing claim pool (retroactive + streaming) ──────────────────────────────
# The one-shot sweep shows the pool is too big to distribute fairly TODAY (only
# ~19 active users). This model instead treats the pool as an emission budget:
#   - retro tranche at epoch 0 to snapshot-active users (rewards early play),
#   - the rest streams over `epochs` and is only claimable by whoever is active
#     that epoch, proportional to that epoch's engagement,
#   - a per-wallet LIFETIME cap stops whales accumulating across epochs,
#   - emission that finds no eligible demand ROLLS FORWARD (never stranded),
#   - engagement grows `growth`/epoch (existing dormant users activate + new
#     joiners arrive), so the active base widens over time,
#   - earned tokens VEST linearly, so we can separate "earned" from "circulating".
# Everything is seeded → deterministic and reproducible.

def _distribute(budget, weights, rcap, alloc):
    """Give `budget` out proportional to `weights`, clamped so no wallet exceeds
    its remaining lifetime cap `rcap`. Mutates `alloc`; returns leftover budget."""
    live = {k: w for k, w in weights.items() if w > 0 and (rcap[k] - alloc.get(k, 0)) > 1e-9}
    for _ in range(16):
        if budget <= 1e-6 or not live:
            break
        tw = sum(live.values()) or 1.0
        added = 0.0
        capped = []
        for k, w in list(live.items()):
            give = budget * w / tw
            room = rcap[k] - alloc.get(k, 0)
            if give >= room:
                give = room
                capped.append(k)
            alloc[k] = alloc.get(k, 0) + give
            added += give
        budget -= added
        for k in capped:
            live.pop(k, None)
        if added <= 1e-6:
            break
    return max(0.0, budget)


def simulate_ongoing(users, pool, epochs, growth, retro_pct, emission, decay,
                     wallet_cap_pct, activ_per_epoch, new_per_epoch, vest, seed):
    rng = random.Random(seed)
    lifetime_cap = pool * wallet_cap_pct
    alloc = {}                      # cumulative C74 per participant id
    cohort = {}                     # id -> 'existing' | 'new'
    earns = []                      # (id, epoch, amount) for vesting
    rcap = {}                       # remaining-cap lookup (defaults to lifetime_cap)

    def cap(i):
        return rcap.get(i, lifetime_cap)

    # snapshot split: who's already active vs dormant-but-existing
    engaged = [u for u in users if w_engage(u) > 0]
    dormant = [u for u in users if w_engage(u) <= 0]
    for u in users:
        cohort[u.id] = "existing"
    prop = {u.id: max(w_engage(u), 0.0) for u in users}     # engagement propensity
    active = {u.id for u in engaged}                          # currently-claiming set
    # propensity seed pool to sample activations / new joiners from
    seedvals = sorted([w_engage(u) for u in engaged]) or [100.0]

    def sample_prop():
        base = rng.choice(seedvals)
        return max(base * rng.uniform(0.4, 1.4), 1.0)

    # ── epoch 0: retroactive tranche to snapshot-active users ────────────────
    retro_budget = pool * retro_pct
    rmap = {u.id: w_engage(u) for u in engaged}
    for i in rmap:
        rcap.setdefault(i, lifetime_cap)
    leftover = _distribute(retro_budget, rmap, {i: lifetime_cap for i in rmap}, alloc)
    for i, v in alloc.items():
        rcap[i] = lifetime_cap
        if v > 0:
            earns.append((i, 0, v))
    carry = leftover                       # unspent retro rolls into streaming

    # streaming emission schedule over `epochs`
    stream_budget = pool - retro_budget
    if emission == "decay":
        wsum = sum(decay ** t for t in range(epochs)) or 1.0
        sched = [stream_budget * (decay ** t) / wsum for t in range(epochs)]
    else:  # flat
        sched = [stream_budget / epochs] * epochs

    dormant_left = [u.id for u in dormant]
    rows = []
    for t in range(epochs):
        # activation wave: some existing dormant users start playing
        n_act = min(len(dormant_left), int(round(activ_per_epoch)))
        for _ in range(n_act):
            i = dormant_left.pop(0)
            active.add(i)
            prop[i] = sample_prop()
        # new joiners arrive (fresh cohort)
        for k in range(int(round(new_per_epoch))):
            nid = f"n{t:02d}_{k:02d}"
            active.add(nid)
            cohort[nid] = "new"
            prop[nid] = sample_prop()
            rcap[nid] = lifetime_cap

        # this epoch's engagement = propensity · growth^t · per-user noise
        g = growth ** t
        eweights = {i: prop[i] * g * rng.uniform(0.7, 1.3) for i in active if prop[i] > 0}
        for i in eweights:
            rcap.setdefault(i, lifetime_cap)

        budget = sched[t] + carry
        prev = dict(alloc)
        carry = _distribute(budget, eweights, rcap, alloc)
        dist = sum(alloc.values()) - sum(prev.values())
        # record each participant's earn this epoch (for linear vesting below)
        for i in eweights:
            d = alloc.get(i, 0) - prev.get(i, 0)
            if d > 1e-9:
                earns.append((i, t + 1, d))
        rows.append({
            "epoch": t + 1,
            "active": len(eweights),
            "emission": round(sched[t]),
            "carry_in": round(budget - sched[t]),
            "distributed": round(dist),
            "carry_out": round(carry),
            "cum_distributed": round(sum(alloc.values())),
            "cum_pct": round(100 * sum(alloc.values()) / pool, 1),
        })

    # linear vesting: an earn at epoch e is fully vested `vest` epochs later;
    # at the horizon its vested fraction = min(1, (epochs - e) / vest).
    vested = 0.0
    for (i, e, amt) in earns:
        frac = 1.0 if vest <= 0 else min(1.0, max(0, epochs - e) / vest)
        vested += amt * frac
    total_dist = sum(alloc.values())
    ids = list(alloc)
    vals = sorted((alloc[i] for i in ids if alloc[i] > 0), reverse=True)
    existing_share = sum(alloc[i] for i in ids if cohort.get(i) == "existing")
    new_share = sum(alloc[i] for i in ids if cohort.get(i) == "new")
    med = lambda a: (sorted(a)[len(a)//2] if a else 0)

    summary = {
        "pool": pool,
        "epochs": epochs,
        "params": {"growth": growth, "retro_pct": retro_pct, "emission": emission,
                   "decay": decay, "wallet_cap_pct": wallet_cap_pct,
                   "activations_per_epoch": activ_per_epoch,
                   "new_per_epoch": new_per_epoch, "vest_epochs": vest, "seed": seed},
        "participants": len([i for i in ids if alloc[i] > 0]),
        "existing_claimants": len([i for i in ids if alloc[i] > 0 and cohort.get(i) == "existing"]),
        "new_claimants": len([i for i in ids if alloc[i] > 0 and cohort.get(i) == "new"]),
        "total_distributed": round(total_dist),
        "distributed_pct": round(100 * total_dist / pool, 1),
        "undistributed": round(pool - total_dist),
        "vested_at_horizon": round(vested),
        "vested_pct_of_distributed": round(100 * vested / total_dist, 1) if total_dist else 0,
        "top": round(vals[0]) if vals else 0,
        "median": round(med(vals)),
        "gini": round(gini(vals), 3),
        "top10_share_pct": round(100 * sum(vals[:10]) / pool, 1),
        "wallet_cap_c74": round(lifetime_cap),
        "existing_cohort_share_pct": round(100 * existing_share / pool, 1),
        "new_cohort_share_pct": round(100 * new_share / pool, 1),
    }
    return rows, summary


def print_ongoing(rows, s, users):
    print(f"\nC74 Airdrop Simulator — ONGOING claim pool · pool {int(s['pool']):,} C74")
    print(f"snapshot {len(users)} users · {s['epochs']} epochs · growth {s['params']['growth']}/epoch"
          f" · retro {int(s['params']['retro_pct']*100)}% · wallet cap {s['params']['wallet_cap_pct']*100:g}%"
          f" · +{s['params']['new_per_epoch']} joiners/epoch\n")
    cols = ["epoch", "active", "emission", "carry_in", "distributed", "carry_out", "cum_distributed", "cum_pct"]
    fmt = lambda v: (f"{v:,}" if isinstance(v, int) else f"{v}")
    w = {c: max(len(c), *(len(fmt(r[c])) for r in rows)) for c in cols}
    hdr = "  ".join(f"{c:>{w[c]}}" for c in cols)
    print(hdr); print("-" * len(hdr))
    for r in rows:
        print("  ".join(f"{fmt(r[c]):>{w[c]}}" for c in cols))
    print("\nSummary")
    for k in ["participants", "existing_claimants", "new_claimants", "total_distributed",
              "distributed_pct", "undistributed", "vested_at_horizon", "vested_pct_of_distributed",
              "top", "median", "gini",
              "top10_share_pct", "wallet_cap_c74", "existing_cohort_share_pct", "new_cohort_share_pct"]:
        v = s[k]
        print(f"  {k:<26} {v:,}" if isinstance(v, int) else f"  {k:<26} {v}")
    print("\nReading: distributed_pct → ~100% means the streaming pool never strands")
    print("tokens (unlike a one-shot cap); cohort shares show early adopters vs new")
    print("joiners; a lower gini + capped top10 means no whale runaway across epochs.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("snapshot")
    ap.add_argument("--pool", type=float, default=100_000_000)
    ap.add_argument("--ongoing", action="store_true", help="run the streaming claim-pool model")
    ap.add_argument("--epochs", type=int, default=24)
    ap.add_argument("--growth", type=float, default=1.20, help="engagement growth per epoch")
    ap.add_argument("--retro-pct", type=float, default=0.30, help="fraction paid retroactively at epoch 0")
    ap.add_argument("--emission", choices=["flat", "decay"], default="decay")
    ap.add_argument("--decay", type=float, default=0.92, help="per-epoch emission decay (emission=decay)")
    ap.add_argument("--wallet-cap-pct", type=float, default=0.02, help="per-wallet lifetime cap (of pool)")
    ap.add_argument("--activations-per-epoch", type=float, default=2, help="existing dormant users that start playing / epoch")
    ap.add_argument("--new-per-epoch", type=float, default=8, help="brand-new joiners / epoch")
    ap.add_argument("--vest", type=int, default=6, help="linear vesting length (epochs)")
    ap.add_argument("--seed", type=int, default=74)
    a = ap.parse_args()

    data = json.load(open(a.snapshot))
    users = [U(r) for r in data["rows"]]
    outdir = os.path.dirname(os.path.abspath(a.snapshot))

    if a.ongoing:
        rows, summary = simulate_ongoing(
            users, a.pool, a.epochs, a.growth, a.retro_pct, a.emission, a.decay,
            a.wallet_cap_pct, a.activations_per_epoch, a.new_per_epoch, a.vest, a.seed)
        print_ongoing(rows, summary, users)
        json.dump({"schedule": rows, "summary": summary},
                  open(os.path.join(outdir, "c74-sim-ongoing.json"), "w"), indent=2)
        print("\nWrote c74-sim-ongoing.json")
    else:
        sweep(users, a.pool, outdir)


if __name__ == "__main__":
    main()
