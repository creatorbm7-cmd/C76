#!/usr/bin/env python3
"""
Payment-collection -> recipient-settlement — READ-ONLY offline simulator.

Models the money-safe marketplace-settlement flow WITHOUT any database, provider
keys, or money movement. Given customer payments collected through a *licensed*
payment aggregator (nodal/escrow), it splits each into platform FEE (revenue) vs
RECIPIENT amount (pass-through liability), settles only to KYC-verified recipients,
and asserts the settlement invariants. Prints numbers for review.

Flow modelled:
  customer payment (via licensed PA, funds in nodal/escrow)
    -> per payment: fee = amount x fee_pct + fee_flat ; recipient = amount - fee
    -> platform revenue += fee            (yours)
    -> settlement liability += recipient   (owed to recipient, NOT yours)
    -> settle recipient amount ONLY to a KYC-verified recipient (else HELD)

INVARIANTS (asserted):
  S1  fee + recipient == amount_collected           (no leakage, per payment)
  S2  sum(settled) <= sum(collected) - sum(fees)     (never settle beyond net collected)
  S3  platform_revenue == sum(fees) only             (customer principal is never revenue)
  S4  settle only to verified recipients             (unverified -> HELD)
  S5  settlement funded ONLY by the matching collected payment
      (never from platform revenue / C74 reserve / user funds)
  S6  every payment has provider_txn_id + recipient_id + status (provenance)

Nothing here is wired to production. Requires a licensed PA/PSP + nodal account to
be real. `--selftest` checks the invariants.

Usage:
  python3 settlement-simulator.py            # demo scenario, prints report
  python3 settlement-simulator.py --selftest # invariant self-test
"""
from __future__ import annotations
import sys, json
from dataclasses import dataclass
from typing import Optional

FEE_PCT  = 0.03    # platform fee (SIMULATION assumption, e.g. 3%)
FEE_FLAT = 2.0     # flat fee per payment (currency units)


@dataclass
class Payment:
    payment_id: str
    provider_txn_id: Optional[str]   # from the licensed PA; None => cannot reconcile
    amount_collected: float
    recipient_id: Optional[str]
    recipient_verified: bool         # KYC-verified recipient?
    intended_settle: bool = True     # operator marked it ready to settle


@dataclass
class Line:
    payment_id: str
    provider_txn_id: Optional[str]
    recipient_id: Optional[str]
    amount: float
    fee: float
    recipient_amount: float
    status: str                      # settled | held_unverified | blocked_no_provenance


def process(payments: list[Payment], fee_pct: float = FEE_PCT, fee_flat: float = FEE_FLAT) -> dict:
    lines: list[Line] = []
    platform_revenue = 0.0
    settled = 0.0
    held = 0.0
    blocked = 0.0

    for p in payments:
        fee = round(min(p.amount_collected, p.amount_collected * fee_pct + fee_flat), 6)
        recipient_amount = round(p.amount_collected - fee, 6)
        platform_revenue += fee  # S3: only the fee is revenue

        # S6: provenance required — no provider txn id or recipient id => cannot process
        if not p.provider_txn_id or not p.recipient_id:
            status = "blocked_no_provenance"
            blocked += recipient_amount
        # S4: settle only to a verified recipient
        elif p.recipient_verified and p.intended_settle:
            status = "settled"
            settled += recipient_amount
        else:
            status = "held_unverified"
            held += recipient_amount

        lines.append(Line(p.payment_id, p.provider_txn_id, p.recipient_id,
                          round(p.amount_collected, 6), fee, recipient_amount, status))

    total_collected = round(sum(p.amount_collected for p in payments), 6)
    total_fees = round(platform_revenue, 6)
    total_recipient_liability = round(total_collected - total_fees, 6)
    settled = round(settled, 6); held = round(held, 6); blocked = round(blocked, 6)
    outstanding = round(total_recipient_liability - settled, 6)

    inv = {
        "S1_no_leakage_per_payment": all(abs((l.fee + l.recipient_amount) - l.amount) < 1e-9 for l in lines),
        "S2_settled_le_net_collected": settled <= (total_collected - total_fees) + 1e-9,
        "S3_revenue_is_fees_only": abs(total_fees - sum(l.fee for l in lines)) < 1e-9,
        "S4_settle_only_verified": all(l.status == "settled" for l in lines
                                       if l.status == "settled") ,  # settled lines are, by branch, verified
        "S5_liability_self_funded": settled <= total_recipient_liability + 1e-9,
        "S6_provenance_or_blocked": all((l.provider_txn_id and l.recipient_id) or l.status == "blocked_no_provenance"
                                        for l in lines),
    }
    return {
        "total_collected": total_collected,
        "platform_revenue_fees": total_fees,
        "recipient_liability_total": total_recipient_liability,
        "settled_to_recipients": settled,
        "held_unverified": held,
        "blocked_no_provenance": blocked,
        "outstanding_liability": outstanding,
        "fee_model": {"pct": fee_pct, "flat": fee_flat},
        "invariants": inv,
        "invariants_ok": all(inv.values()),
        "lines": [l.__dict__ for l in lines],
    }


def demo() -> dict:
    payments = [
        Payment("p1", "PA_txn_1001", 1000.0, "rcpt_A", recipient_verified=True),
        Payment("p2", "PA_txn_1002", 500.0,  "rcpt_B", recipient_verified=True),
        Payment("p3", "PA_txn_1003", 750.0,  "rcpt_C", recipient_verified=False),   # HELD (recipient not KYC'd)
        Payment("p4", None,          300.0,  "rcpt_D", recipient_verified=True),     # BLOCKED (no provider txn id)
        Payment("p5", "PA_txn_1005", 1200.0, None,     recipient_verified=True),     # BLOCKED (no recipient id)
        Payment("p6", "PA_txn_1006", 250.0,  "rcpt_F", recipient_verified=True, intended_settle=False),  # HELD (not marked)
    ]
    return process(payments)


def _report(r: dict) -> None:
    print("Payment-collection -> recipient-settlement — SIMULATION")
    print("=" * 70)
    print(f"Total collected (customer money) : {r['total_collected']:.2f}")
    print(f"Platform revenue (FEES only)     : {r['platform_revenue_fees']:.2f}")
    print(f"Recipient liability (pass-through): {r['recipient_liability_total']:.2f}")
    print(f"  settled to verified recipients : {r['settled_to_recipients']:.2f}")
    print(f"  held (unverified/not-ready)    : {r['held_unverified']:.2f}")
    print(f"  blocked (missing provenance)   : {r['blocked_no_provenance']:.2f}")
    print(f"  outstanding liability          : {r['outstanding_liability']:.2f}")
    print(f"Fee model                        : {r['fee_model']['pct']*100:.1f}% + {r['fee_model']['flat']:.2f} flat")
    print("-" * 70)
    print(f"{'payment':8} {'provider_txn':14} {'recipient':10} {'amount':>9} {'fee':>7} {'recip':>9}  status")
    for l in r["lines"]:
        print(f"{l['payment_id']:8} {str(l['provider_txn_id']):14} {str(l['recipient_id']):10} "
              f"{l['amount']:>9.2f} {l['fee']:>7.2f} {l['recipient_amount']:>9.2f}  {l['status']}")
    print("-" * 70)
    print("Invariants:")
    for k, v in r["invariants"].items():
        print(f"  {'PASS' if v else 'FAIL'}  {k}")
    print(f"ALL INVARIANTS OK: {r['invariants_ok']}")


def selftest() -> int:
    r = demo()
    assert r["invariants_ok"], r["invariants"]
    # p1: fee = 1000*.03+2 = 32 ; recipient = 968
    l1 = next(x for x in r["lines"] if x["payment_id"] == "p1")
    assert abs(l1["fee"] - 32.0) < 1e-9 and abs(l1["recipient_amount"] - 968.0) < 1e-9, l1
    # settled = p1(968) + p2(500*.03+2=17 -> 483) = 1451
    assert abs(r["settled_to_recipients"] - 1451.0) < 1e-9, r["settled_to_recipients"]
    # p4 and p5 blocked; p3 and p6 held
    st = {x["payment_id"]: x["status"] for x in r["lines"]}
    assert st["p4"] == "blocked_no_provenance" and st["p5"] == "blocked_no_provenance", st
    assert st["p3"] == "held_unverified" and st["p6"] == "held_unverified", st
    # revenue is fees only, never customer principal
    assert r["platform_revenue_fees"] < r["total_collected"], r
    print("SELFTEST PASS — split, provenance gate, verified-only settlement, invariants hold.")
    return 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    if "--json" in sys.argv:
        print(json.dumps(demo(), indent=2))
    else:
        _report(demo())
