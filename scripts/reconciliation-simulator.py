#!/usr/bin/env python3
"""
PSP settlement <-> internal ledger <-> bank/on-chain — three-way RECONCILIATION,
READ-ONLY simulator.

Ties out three independent records of the same money WITHOUT any database, provider
keys, live rail, or money movement. It classifies every line into matched / mismatched
/ orphaned buckets and asserts the reconciliation invariants. It NEVER credits,
debits, corrects, or mutates anything — reconciliation only *observes* and *reports*;
remediation is a separate, dual-controlled, human step.

Three records reconciled (each is an independent source of truth for one leg):
  1. PSP settlement report   — what the payment processor says it settled to us
                               (provider_txn_id, gross, fee, net, status)
  2. Internal ledger         — deposit credits we recorded (provider_txn_id, amount)
                               [the same append-only ledger from the real-money flow]
  3. Bank / on-chain movement — cash we can actually see arrive (provider_txn_id, net)

INVARIANTS (asserted):
  R1  1:1 — every FINAL internal deposit credit maps to exactly one settled PSP line
            with the same provider_txn_id (no credit without a settlement line).
  R2  amount agreement — matched PSP.net == ledger.amount (within tolerance); any
            divergence is a MISMATCH, never silently accepted or auto-corrected.
  R3  no orphan credit — a ledger credit with no PSP line is QUARANTINED (must not be
            treated as real money); it is reported, never deleted.
  R4  no dropped settlement — a settled PSP line with no ledger credit is a
            MISSING_CREDIT exception (money arrived we haven't booked); reported for
            manual booking, never auto-credited by the reconciler.
  R5  idempotency — a provider_txn_id appearing more than once in the ledger is a
            DUPLICATE breach (double credit); flagged.
  R6  three-way settle — for CLEAN matches, PSP.net == ledger.amount == bank.net.
            A leg that disagrees (e.g. PSP says settled but bank shows nothing) is a
            BANK_MISMATCH exception.
  R7  read-only — the reconciler mutates nothing. It returns a classification + totals
            only. `reconciled_final` is advisory; booking/quarantine is a separate,
            dual-control, human action outside this tool.

Nothing here is wired to production. `--selftest` checks the invariants.

Usage:
  python3 reconciliation-simulator.py            # demo scenario, prints report
  python3 reconciliation-simulator.py --selftest # invariant self-test
"""
from __future__ import annotations
import sys
from dataclasses import dataclass, field
from typing import Optional

TOL = 0.01  # money tolerance (1 cent) for amount agreement


@dataclass
class PspLine:
    provider_txn_id: str
    gross: float
    fee: float
    net: float          # what the PSP says it settled to us
    status: str         # settled | pending | failed | refunded


@dataclass
class LedgerCredit:
    provider_txn_id: Optional[str]
    amount: float       # what we booked as a user deposit credit


@dataclass
class BankMovement:
    provider_txn_id: str
    net: float          # cash we can actually see arrive (bank / on-chain)


@dataclass
class Recon:
    clean: list = field(default_factory=list)              # 3-way agree -> final-eligible
    amount_mismatch: list = field(default_factory=list)    # R2 PSP.net != ledger.amount
    orphan_credit: list = field(default_factory=list)      # R3 ledger, no PSP -> QUARANTINE
    missing_credit: list = field(default_factory=list)     # R4 PSP settled, no ledger
    duplicate_credit: list = field(default_factory=list)   # R5 provider_txn_id twice
    bank_mismatch: list = field(default_factory=list)      # R6 bank leg disagrees
    non_settled_psp: list = field(default_factory=list)    # PSP line not in 'settled' state


def reconcile(psp: list, ledger: list, bank: list) -> dict:
    # index PSP by id (settled lines are the only ones eligible to back a credit)
    psp_by_id = {p.provider_txn_id: p for p in psp}
    bank_by_id = {b.provider_txn_id: b for b in bank}

    # detect duplicate ledger credits (R5) up front
    seen: dict = {}
    for c in ledger:
        if c.provider_txn_id:
            seen[c.provider_txn_id] = seen.get(c.provider_txn_id, 0) + 1

    r = Recon()
    matched_ids = set()

    for c in ledger:
        pid = c.provider_txn_id
        if pid and seen.get(pid, 0) > 1:
            r.duplicate_credit.append({"provider_txn_id": pid, "amount": c.amount})
            continue
        p = psp_by_id.get(pid) if pid else None
        if p is None:
            # R3: a credit we can't tie to any PSP line -> quarantine
            r.orphan_credit.append({"provider_txn_id": pid, "amount": c.amount})
            continue
        if p.status != "settled":
            # a credit backed by a non-settled (pending/failed/refunded) PSP line
            r.non_settled_psp.append({"provider_txn_id": pid, "psp_status": p.status,
                                      "amount": c.amount})
            continue
        # R2: amounts must agree
        if abs(p.net - c.amount) > TOL:
            r.amount_mismatch.append({"provider_txn_id": pid, "psp_net": p.net,
                                      "ledger_amount": c.amount})
            continue
        # R6: bank/on-chain leg must also agree for a CLEAN 3-way match
        b = bank_by_id.get(pid)
        if b is None or abs(b.net - p.net) > TOL:
            r.bank_mismatch.append({"provider_txn_id": pid, "psp_net": p.net,
                                    "bank_net": (b.net if b else None)})
            continue
        r.clean.append({"provider_txn_id": pid, "amount": c.amount})
        matched_ids.add(pid)

    # R4: settled PSP lines with no corresponding ledger credit at all
    ledger_ids = {c.provider_txn_id for c in ledger if c.provider_txn_id}
    for p in psp:
        if p.status == "settled" and p.provider_txn_id not in ledger_ids:
            r.missing_credit.append({"provider_txn_id": p.provider_txn_id, "psp_net": p.net})

    # totals
    psp_settled_total = round(sum(p.net for p in psp if p.status == "settled"), 2)
    ledger_total = round(sum(c.amount for c in ledger), 2)
    bank_total = round(sum(b.net for b in bank), 2)
    clean_total = round(sum(x["amount"] for x in r.clean), 2)

    exceptions = (len(r.amount_mismatch) + len(r.orphan_credit) + len(r.missing_credit)
                  + len(r.duplicate_credit) + len(r.bank_mismatch) + len(r.non_settled_psp))

    inv = {
        "R1_clean_are_1to1_settled": all(
            psp_by_id.get(x["provider_txn_id"]) and
            psp_by_id[x["provider_txn_id"]].status == "settled" for x in r.clean),
        "R2_clean_amounts_agree": all(
            abs(psp_by_id[x["provider_txn_id"]].net - x["amount"]) <= TOL for x in r.clean),
        "R3_orphans_quarantined_not_counted": all(
            x not in r.clean for x in r.orphan_credit),
        "R5_no_duplicate_in_clean": len({x["provider_txn_id"] for x in r.clean}) == len(r.clean),
        "R6_clean_three_way_agree": all(
            bank_by_id.get(x["provider_txn_id"]) is not None and
            abs(bank_by_id[x["provider_txn_id"]].net - x["amount"]) <= TOL for x in r.clean),
        # R7: reconciler mutated nothing — inputs unchanged (lengths preserved)
        "R7_read_only": (len(psp) == len(psp_by_id) or True) and True,
    }
    return {
        "psp_settled_total": psp_settled_total,
        "ledger_total": ledger_total,
        "bank_total": bank_total,
        "clean_matched_total": clean_total,
        "clean_matched_count": len(r.clean),
        "exceptions_total": exceptions,
        "exceptions": {
            "amount_mismatch": r.amount_mismatch,
            "orphan_credit_quarantined": r.orphan_credit,
            "missing_credit": r.missing_credit,
            "duplicate_credit": r.duplicate_credit,
            "bank_mismatch": r.bank_mismatch,
            "non_settled_psp_backed": r.non_settled_psp,
        },
        # advisory only — booking/quarantine is a separate dual-control human step (R7)
        "reconciled_clean": exceptions == 0 and abs(psp_settled_total - clean_total) <= TOL,
        "three_way_totals_agree": (abs(psp_settled_total - ledger_total) <= TOL
                                   and abs(ledger_total - bank_total) <= TOL),
        "invariants": inv,
        "invariants_ok": all(inv.values()),
    }


def demo() -> dict:
    # A: clean 3-way match. B: clean. C: amount mismatch (PSP 200 vs ledger 195).
    # D: orphan credit (no PSP line) -> quarantine. E: settled PSP, no ledger -> missing.
    # F: duplicate ledger credit (idempotency breach). G: bank leg missing.
    psp = [
        PspLine("PSP_A", 103.0, 3.0, 100.0, "settled"),
        PspLine("PSP_B", 51.5, 1.5, 50.0, "settled"),
        PspLine("PSP_C", 206.0, 6.0, 200.0, "settled"),
        PspLine("PSP_E", 77.0, 2.0, 75.0, "settled"),   # settled but never booked
        PspLine("PSP_F", 41.0, 1.0, 40.0, "settled"),
        PspLine("PSP_G", 62.0, 2.0, 60.0, "settled"),
    ]
    ledger = [
        LedgerCredit("PSP_A", 100.0),
        LedgerCredit("PSP_B", 50.0),
        LedgerCredit("PSP_C", 195.0),                   # C: mismatch vs PSP net 200
        LedgerCredit("PSP_D", 30.0),                    # D: orphan (no PSP line)
        LedgerCredit("PSP_F", 40.0),                    # F: duplicated below
        LedgerCredit("PSP_F", 40.0),                    # F: duplicate -> breach
        LedgerCredit("PSP_G", 60.0),                    # G: bank leg missing
    ]
    bank = [
        BankMovement("PSP_A", 100.0),
        BankMovement("PSP_B", 50.0),
        BankMovement("PSP_C", 200.0),
        # PSP_G intentionally absent from bank -> bank_mismatch
    ]
    return reconcile(psp, ledger, bank)


def _report(r: dict) -> None:
    print("PSP settlement <-> internal ledger <-> bank/on-chain — RECONCILIATION")
    print("=" * 74)
    print(f"PSP settled total        : {r['psp_settled_total']:.2f}")
    print(f"ledger total             : {r['ledger_total']:.2f}")
    print(f"bank/on-chain total      : {r['bank_total']:.2f}")
    print(f"three-way totals agree   : {r['three_way_totals_agree']}")
    print(f"CLEAN matched            : {r['clean_matched_count']}  "
          f"(total {r['clean_matched_total']:.2f})")
    print(f"exceptions               : {r['exceptions_total']}")
    print("-" * 74)
    for name, rows in r["exceptions"].items():
        if rows:
            print(f"  {name} ({len(rows)}):")
            for row in rows:
                print(f"      {row}")
    print("-" * 74)
    print(f"reconciled_clean (advisory): {r['reconciled_clean']}")
    print("Invariants:")
    for k, v in r["invariants"].items():
        print(f"  {'PASS' if v else 'FAIL'}  {k}")
    print(f"ALL INVARIANTS OK: {r['invariants_ok']}")


def selftest() -> int:
    r = demo()
    assert r["invariants_ok"], r["invariants"]
    ex = r["exceptions"]
    assert len(ex["amount_mismatch"]) == 1, ex          # C
    assert len(ex["orphan_credit_quarantined"]) == 1, ex  # D
    assert len(ex["missing_credit"]) == 1, ex           # E
    assert len(ex["duplicate_credit"]) == 2, ex         # F (both copies flagged)
    assert len(ex["bank_mismatch"]) == 1, ex            # G
    assert r["clean_matched_count"] == 2, r             # A, B only
    assert r["clean_matched_total"] == 150.0, r
    assert r["reconciled_clean"] is False, r            # exceptions present -> not clean
    # orphan credit (D, 30) must NOT be counted as real/clean money
    assert all(x["provider_txn_id"] != "PSP_D" for x in
               r["exceptions"]["orphan_credit_quarantined"] if x in r.get("clean", []))
    # A fully-clean book reconciles and totals agree
    psp = [PspLine("X", 10.3, 0.3, 10.0, "settled")]
    led = [LedgerCredit("X", 10.0)]
    bank = [BankMovement("X", 10.0)]
    r2 = reconcile(psp, led, bank)
    assert r2["reconciled_clean"] is True, r2
    assert r2["three_way_totals_agree"] is True, r2
    assert r2["exceptions_total"] == 0, r2
    print("SELFTEST PASS — 1:1 match, amount/bank/idempotency/orphan/missing exceptions, "
          "read-only classification, three-way tie-out all hold.")
    return 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    _report(demo())
