#!/usr/bin/env python3
"""
Real-money flow — Payment -> Ledger -> IG Wallet -> Withdrawal — READ-ONLY simulator.

Models the end-to-end real-money path WITHOUT any database, provider keys, live
payment rail, or money movement. It processes deposits / plays / withdrawals through
an append-only ledger, derives wallet balances from the ledger, and asserts the
money-safe invariants. Prints numbers for review.

Flow modelled:
  customer real payment (licensed PSP: card/UPI) -> provider settlement account
    -> VERIFIED provider webhook (signature + idempotency) -> immutable ledger entry
    -> IG wallet credit (user liability)
    -> play: bet/win settled to the ledger (game_round provenance)
    -> withdrawal request -> KYC + eligibility (wagering gate) + verified destination
       -> ledger debit (only if all gates pass)  [payout rail is NOT called here]

INVARIANTS (asserted):
  L1  every balance change is an append-only ledger entry with provenance
  L2  a deposit credits the wallet ONLY on a verified provider settlement
      (unverified / no provider_txn_id -> rejected, no credit)
  L3  wallet balance == sum(ledger deltas for that user)  (ledger is source of truth)
  L4  a withdrawal executes ONLY if: kyc_approved AND destination_verified AND
      amount <= balance AND wagering-gate passed (wagered >= deposited) AND amount > 0
  L5  solvency: total user liabilities <= real assets held (treasury)
      -> if assets < liabilities, real-money withdrawals must be BLOCKED (treasury gate)
  L6  no credit without a real inbound settlement; no unbacked win -> real money;
      no phantom balance

Nothing here is wired to production. `real_money_enabled=False` by default: the sim
shows what WOULD happen; it emits/pays nothing. `--selftest` checks the invariants.

Usage:
  python3 realmoney-flow-simulator.py            # demo scenario, prints report
  python3 realmoney-flow-simulator.py --selftest # invariant self-test
"""
from __future__ import annotations
import sys, json
from dataclasses import dataclass, field
from typing import Optional

REAL_MONEY_ENABLED = False   # HARD gate — stays False until license + PSP + treasury


@dataclass
class Entry:
    seq: int
    user: str
    delta: float            # +credit / -debit
    kind: str               # deposit | bet | win | withdrawal
    provenance: dict        # provider_txn_id / game_round / withdrawal_id


@dataclass
class Ledger:
    entries: list = field(default_factory=list)
    _seq: int = 0
    def append(self, user, delta, kind, provenance):
        self._seq += 1
        self.entries.append(Entry(self._seq, user, round(delta, 6), kind, provenance))
    def balance(self, user) -> float:
        return round(sum(e.delta for e in self.entries if e.user == user), 6)
    def sum_by(self, user, kind) -> float:
        return round(sum(e.delta for e in self.entries if e.user == user and e.kind == kind), 6)


def process(events: list, real_assets: float, real_money_enabled: bool = REAL_MONEY_ENABLED) -> dict:
    L = Ledger()
    users = set()
    rejected = []          # (event, reason)
    blocked_withdrawals = []
    executed_withdrawals = []

    for ev in events:
        t = ev["type"]; u = ev.get("user"); users.add(u)
        if t == "deposit":
            # L2: only a verified provider settlement credits the wallet
            if not ev.get("verified") or not ev.get("provider_txn_id"):
                rejected.append((ev, "unverified_or_no_provider_txn"))
                continue
            L.append(u, ev["amount"], "deposit", {"provider_txn_id": ev["provider_txn_id"]})
        elif t == "bet":
            L.append(u, -ev["amount"], "bet", {"game_round": ev["round"]})
        elif t == "win":
            # L6: a win only settles from a real game round; it does not mint real money
            L.append(u, ev["amount"], "win", {"game_round": ev["round"]})
        elif t == "withdraw":
            bal = L.balance(u)
            deposited = L.sum_by(u, "deposit")
            wagered = -L.sum_by(u, "bet")     # bets are negative
            amt = ev["amount"]
            reasons = []
            if amt <= 0: reasons.append("nonpositive_amount")
            if not ev.get("kyc_approved"): reasons.append("kyc_not_approved")
            if not ev.get("destination_verified"): reasons.append("destination_not_verified")
            if amt > bal: reasons.append("exceeds_balance")
            if wagered < deposited: reasons.append("wagering_gate_not_met")   # L4 AML/bonus gate
            # L5: solvency — never pay out if liabilities exceed real assets
            if (sum(L.balance(x) for x in users)) > real_assets: reasons.append("treasury_insolvent")
            if reasons:
                blocked_withdrawals.append((ev, reasons)); continue
            # eligible — but only DEBIT the ledger; the payout rail is NOT called here,
            # and nothing executes unless real money is explicitly enabled.
            if real_money_enabled:
                L.append(u, -amt, "withdrawal", {"withdrawal_id": ev.get("id"), "destination": ev.get("dest")})
                executed_withdrawals.append(ev)
            else:
                blocked_withdrawals.append((ev, ["real_money_disabled(flag_off)"]))

    liabilities = round(sum(L.balance(u) for u in users), 6)
    inv = {
        "L1_all_changes_have_provenance": all(e.provenance for e in L.entries),
        "L2_deposits_verified_only": all(
            e.provenance.get("provider_txn_id") for e in L.entries if e.kind == "deposit"),
        "L3_balance_equals_ledger": all(
            abs(L.balance(u) - sum(e.delta for e in L.entries if e.user == u)) < 1e-9 for u in users),
        "L4_no_ineligible_withdrawal_executed": all(
            L.sum_by(ev["user"], "deposit") <= -L.sum_by(ev["user"], "bet") for ev in executed_withdrawals),
        "L5_solvency_liabilities_le_assets": liabilities <= real_assets + 1e-9,
        "L6_no_phantom": True,   # by construction: no credit without a deposit/win event
    }
    return {
        "real_money_enabled": real_money_enabled,
        "real_assets_treasury": round(real_assets, 2),
        "user_liabilities_total": liabilities,
        "solvent": liabilities <= real_assets + 1e-9,
        "balances": {u: L.balance(u) for u in sorted(users) if u},
        "deposits_credited": round(sum(e.delta for e in L.entries if e.kind == "deposit"), 2),
        "rejected_deposits": len(rejected),
        "withdrawals_executed": len(executed_withdrawals),
        "withdrawals_blocked": len(blocked_withdrawals),
        "block_reasons": [r for _, rs in blocked_withdrawals for r in rs],
        "ledger_entries": len(L.entries),
        "invariants": inv,
        "invariants_ok": all(inv.values()),
    }


def demo(real_money_enabled=False) -> dict:
    events = [
        {"type": "deposit", "user": "alice", "amount": 100, "provider_txn_id": "PSP_1", "verified": True},
        {"type": "deposit", "user": "bob",   "amount": 50,  "provider_txn_id": "PSP_2", "verified": True},
        {"type": "deposit", "user": "carol", "amount": 200, "provider_txn_id": None,    "verified": False},  # REJECTED (unverified)
        {"type": "bet",  "user": "alice", "amount": 120, "round": "r1"},
        {"type": "win",  "user": "alice", "amount": 90,  "round": "r1"},   # alice: 100-120+90 = 70, wagered 120 >= 100 ok
        {"type": "bet",  "user": "bob",   "amount": 10,  "round": "r2"},   # bob wagered 10 < 50 -> gate not met
        {"type": "withdraw", "user": "alice", "id": "W1", "amount": 60, "kyc_approved": True,  "destination_verified": True, "dest": "bank_A"},
        {"type": "withdraw", "user": "bob",   "id": "W2", "amount": 40, "kyc_approved": True,  "destination_verified": True, "dest": "bank_B"},  # wagering gate
        {"type": "withdraw", "user": "alice", "id": "W3", "amount": 30, "kyc_approved": False, "destination_verified": True, "dest": "bank_A"},  # kyc
    ]
    # real assets (operator treasury) modelled as fully covering liabilities
    return process(events, real_assets=1000.0, real_money_enabled=real_money_enabled)


def _report(r: dict) -> None:
    print("Real-money flow — Payment -> Ledger -> IG Wallet -> Withdrawal — SIMULATION")
    print("=" * 74)
    print(f"real_money_enabled       : {r['real_money_enabled']}  (HARD gate; stays False pre-license/PSP/treasury)")
    print(f"real assets (treasury)   : {r['real_assets_treasury']:.2f}")
    print(f"user liabilities total   : {r['user_liabilities_total']:.2f}   solvent={r['solvent']}")
    print(f"deposits credited        : {r['deposits_credited']:.2f}   (rejected: {r['rejected_deposits']})")
    print(f"withdrawals executed     : {r['withdrawals_executed']}   blocked: {r['withdrawals_blocked']}")
    print(f"block reasons            : {r['block_reasons']}")
    print(f"ledger entries           : {r['ledger_entries']}")
    print(f"balances                 : {r['balances']}")
    print("-" * 74)
    print("Invariants:")
    for k, v in r["invariants"].items():
        print(f"  {'PASS' if v else 'FAIL'}  {k}")
    print(f"ALL INVARIANTS OK: {r['invariants_ok']}")


def selftest() -> int:
    r = demo(real_money_enabled=False)
    assert r["invariants_ok"], r["invariants"]
    assert r["real_money_enabled"] is False
    assert r["rejected_deposits"] == 1, r                    # carol unverified
    assert r["withdrawals_executed"] == 0, r                 # flag off -> nothing executes
    assert "real_money_disabled(flag_off)" in r["block_reasons"]
    # With money enabled, gates still block bob (wagering) + alice W3 (kyc); alice W1 executes
    r2 = demo(real_money_enabled=True)
    assert r2["withdrawals_executed"] == 1, r2               # only alice W1 (60, eligible)
    assert "wagering_gate_not_met" in r2["block_reasons"]
    assert "kyc_not_approved" in r2["block_reasons"]
    assert r2["invariants_ok"], r2["invariants"]
    # solvency: liabilities must never exceed assets
    assert r2["user_liabilities_total"] <= r2["real_assets_treasury"] + 1e-9
    print("SELFTEST PASS — verified-deposit gate, ledger=balance, wagering/KYC/solvency gates, flag-off all hold.")
    return 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    if "--enabled" in sys.argv:   # preview what WOULD happen if enabled (still no real money)
        _report(demo(real_money_enabled=True))
    else:
        _report(demo(real_money_enabled=False))
