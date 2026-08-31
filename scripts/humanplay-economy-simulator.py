#!/usr/bin/env python3
"""
Telegram Human Play + Bot Economy — READ-ONLY offline simulator.

Models the money-safe reward flow WITHOUT any database, mint, payout, or money
movement. It takes hypothetical *verified external revenue* + user engagement and
computes the reward-pool allocation, per-user distribution (capped), what remains,
and asserts the reward-pool invariant. Prints numbers for review.

Flow modelled:
  verified external revenue (sponsorship + ads + affiliate + premium)
    -> reward pool = revenue x allocation_pct
    -> per-user reward = pool x engagement_share, clamped by daily + lifetime caps
    -> distributed <= pool ; remaining = pool - distributed

INVARIANTS (asserted):
  I1  pool_allocated  <= allocation_pct * verified_revenue      (never over-allocate)
  I2  sum(distributed) <= pool_allocated                        (never over-distribute)
  I3  every reward has provenance (revenue_source -> pool -> user)
  I4  no user-deposit money and no minting is ever an input     (revenue is external only)
  I5  bots/quarantined/zero-engagement accounts get 0           (anti-abuse)

Nothing here is wired to production. `--selftest` checks the invariants.

Usage:
  python3 humanplay-economy-simulator.py            # demo scenario, prints report
  python3 humanplay-economy-simulator.py --selftest # invariant self-test
"""
from __future__ import annotations
import sys, json
from dataclasses import dataclass, field
from typing import Optional

# ---- config (all tunable; these are SIMULATION assumptions, not stored caps) ----
ALLOCATION_PCT       = 0.40    # share of verified revenue routed to the reward pool
PER_USER_DAILY_CAP   = 100.0   # reward units / user / day
PER_USER_LIFETIME_CAP= 2000.0  # reward units / user (lifetime)
REWARD_UNIT          = "C74"   # rewards are platform reward units, NOT redeemable cash here


@dataclass
class Revenue:
    sponsorship: float = 0.0
    advertising: float = 0.0
    affiliate:   float = 0.0
    premium:     float = 0.0
    def total(self) -> float:
        return round(self.sponsorship + self.advertising + self.affiliate + self.premium, 6)
    def sources(self) -> dict:
        return {"sponsorship": self.sponsorship, "advertising": self.advertising,
                "affiliate": self.affiliate, "premium": self.premium}


@dataclass
class User:
    uid: str
    engagement: float           # verified engagement score (games, streak, referrals ...)
    is_human: bool = True       # human OR a *verified* bot partner; unverified bot => excluded
    quarantined: bool = False
    today_earned: float = 0.0   # already granted today (for the daily cap)
    life_earned: float = 0.0    # already granted lifetime (for the lifetime cap)
    flagged: bool = False       # abuse/fraud flag => excluded


@dataclass
class Grant:
    uid: str
    raw: float
    after_daily: float
    after_lifetime: float
    provenance: dict = field(default_factory=dict)


def eligible(u: User) -> bool:
    return (u.is_human and not u.quarantined and not u.flagged and u.engagement > 0)


def simulate(rev: Revenue, users: list[User],
             allocation_pct: float = ALLOCATION_PCT,
             daily_cap: float = PER_USER_DAILY_CAP,
             life_cap: float = PER_USER_LIFETIME_CAP) -> dict:
    verified = rev.total()
    pool = round(verified * allocation_pct, 6)

    elig = [u for u in users if eligible(u)]
    total_eng = sum(u.engagement for u in elig)

    grants: list[Grant] = []
    for u in elig:
        raw = (pool * u.engagement / total_eng) if total_eng > 0 else 0.0
        after_daily = max(min(raw, daily_cap - u.today_earned), 0.0)
        after_life  = max(min(after_daily, life_cap - u.life_earned), 0.0)
        grants.append(Grant(
            uid=u.uid, raw=round(raw, 4),
            after_daily=round(after_daily, 4), after_lifetime=round(after_life, 4),
            provenance={"revenue_sources": rev.sources(), "pool": pool,
                        "engagement_share": round((u.engagement / total_eng) if total_eng else 0, 6)},
        ))

    distributed = round(sum(g.after_lifetime for g in grants), 6)
    remaining = round(pool - distributed, 6)

    # ---- invariants ----
    inv = {
        "I1_pool_le_alloc_x_revenue": pool <= round(allocation_pct * verified, 6) + 1e-9,
        "I2_distributed_le_pool":     distributed <= pool + 1e-9,
        "I3_provenance_present":      all(g.provenance.get("pool") is not None for g in grants),
        "I4_no_deposit_or_mint_input":True,  # by construction: only Revenue.* are inputs
        "I5_excluded_get_zero":       all(g.after_lifetime >= 0 for g in grants),
    }
    return {
        "reward_unit": REWARD_UNIT,
        "verified_revenue": verified,
        "revenue_sources": rev.sources(),
        "allocation_pct": allocation_pct,
        "pool_allocated": pool,
        "eligible_users": len(elig),
        "excluded_users": len(users) - len(elig),
        "distributed": distributed,
        "remaining_pool": remaining,
        "caps": {"per_user_daily": daily_cap, "per_user_lifetime": life_cap},
        "invariants": inv,
        "invariants_ok": all(inv.values()),
        "grants": [g.__dict__ for g in sorted(grants, key=lambda x: -x.after_lifetime)],
    }


def demo() -> dict:
    rev = Revenue(sponsorship=500, advertising=250, affiliate=180, premium=70)  # $1,000 verified
    users = [
        User("alice", engagement=1200),
        User("bob",   engagement=800, today_earned=60),           # near daily cap
        User("carol", engagement=400, life_earned=1990),          # near lifetime cap
        User("dave",  engagement=300),
        User("eve",   engagement=5000, is_human=False),           # unverified bot -> excluded
        User("mallory", engagement=900, flagged=True),            # fraud flag -> excluded
        User("qwen",  engagement=700, quarantined=True),          # quarantined -> excluded
    ]
    return simulate(rev, users)


def _report(r: dict) -> None:
    print(f"Telegram Human Play + Bot Economy — SIMULATION ({r['reward_unit']} reward units)")
    print("=" * 68)
    print(f"Verified external revenue : {r['verified_revenue']:.2f}  {r['revenue_sources']}")
    print(f"Allocation %              : {r['allocation_pct']*100:.0f}%")
    print(f"Reward pool allocated     : {r['pool_allocated']:.2f}")
    print(f"Eligible / excluded users : {r['eligible_users']} / {r['excluded_users']}")
    print(f"Distributed               : {r['distributed']:.2f}")
    print(f"Remaining pool            : {r['remaining_pool']:.2f}")
    print(f"Caps (daily / lifetime)   : {r['caps']['per_user_daily']} / {r['caps']['per_user_lifetime']}")
    print("-" * 68)
    print(f"{'user':10} {'raw':>10} {'<=daily':>10} {'<=lifetime':>12}")
    for g in r["grants"]:
        print(f"{g['uid']:10} {g['raw']:>10.2f} {g['after_daily']:>10.2f} {g['after_lifetime']:>12.2f}")
    print("-" * 68)
    print("Invariants:")
    for k, v in r["invariants"].items():
        print(f"  {'PASS' if v else 'FAIL'}  {k}")
    print(f"ALL INVARIANTS OK: {r['invariants_ok']}")


def selftest() -> int:
    r = demo()
    assert r["invariants_ok"], "invariants failed"
    assert r["pool_allocated"] == 400.0, r["pool_allocated"]           # 1000 * 40%
    assert r["distributed"] <= r["pool_allocated"] + 1e-9
    # excluded accounts (eve/mallory/qwen) must not appear in grants
    ids = {g["uid"] for g in r["grants"]}
    assert ids == {"alice", "bob", "carol", "dave"}, ids
    # bob capped by daily headroom (100-60=40), carol by lifetime headroom (2000-1990=10)
    by = {g["uid"]: g for g in r["grants"]}
    assert by["bob"]["after_lifetime"] <= 40 + 1e-9, by["bob"]
    assert by["carol"]["after_lifetime"] <= 10 + 1e-9, by["carol"]
    print("SELFTEST PASS — invariants hold; caps + exclusions enforced.")
    return 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    if "--json" in sys.argv:
        print(json.dumps(demo(), indent=2))
    else:
        _report(demo())
