#!/usr/bin/env python3
"""
C74 airdrop Merkle-tree builder — offline, zero-dependency.

Turns an {address: amount} allocation into the Merkle root + per-address proofs
that `contracts/C74MerkleClaim.sol` verifies on-chain. Pure Python: an embedded
Keccak-256 (the Ethereum/TVM hash, NOT FIPS SHA3-256) and a base58check decoder
for TRON `T...` addresses. No pip installs, no network, no chain.

Leaf/tree encoding — must match the contract byte-for-byte:
  leaf  = keccak256( abi.encodePacked(uint256 index, address account, uint256 amount) )
        = keccak256( index[32] || account[20] || amount[32] )        (84 bytes)
  node  = keccak256( sorted(left, right) )   # commutative pair hash (OZ MerkleProof)

`amount` is in TOKEN BASE UNITS (human C74 × 10**decimals). Values are emitted as
decimal strings so JS never loses precision on big integers.

Usage:
  python3 scripts/c74-merkle-build.py --selftest          # verify the hash + a known tree
  python3 scripts/c74-merkle-build.py --demo out/          # write a runnable testnet demo tree
  python3 scripts/c74-merkle-build.py alloc.json out/      # build from your allocation
  python3 scripts/c74-merkle-build.py alloc.csv  out/ --decimals 18

Input (either):
  JSON: {"decimals": 18, "claims": {"T-address": <human amount>, ...}}
  CSV : header `address,amount` then one row per claimant (amount = human C74)

Outputs in <outdir>:
  c74-merkle-root.txt      — 0x… root (paste into the deploy migration)
  c74-merkle-proofs.json   — { merkleRoot, decimals, tokenTotal, claims: {addr: {index, amountRaw, amount, proof[]}} }
"""
import sys, os, json, csv, argparse, hashlib


# ── Keccak-256 (Ethereum/TVM) — compact, self-verified below ─────────────────
def keccak256(msg: bytes) -> bytes:
    RNDC = [
        0x0000000000000001, 0x0000000000008082, 0x800000000000808a, 0x8000000080008000,
        0x000000000000808b, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
        0x000000000000008a, 0x0000000000000088, 0x0000000080008009, 0x000000008000000a,
        0x000000008000808b, 0x800000000000008b, 0x8000000000008089, 0x8000000000008003,
        0x8000000000008002, 0x8000000000000080, 0x000000000000800a, 0x800000008000000a,
        0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008]
    ROTC = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44]
    PILN = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1]
    M = (1 << 64) - 1

    def rol(a, n):
        return ((a << n) | (a >> (64 - n))) & M

    def keccakf(st):
        for r in range(24):
            bc = [st[i] ^ st[i + 5] ^ st[i + 10] ^ st[i + 15] ^ st[i + 20] for i in range(5)]
            for i in range(5):
                t = bc[(i + 4) % 5] ^ rol(bc[(i + 1) % 5], 1)
                for j in range(0, 25, 5):
                    st[j + i] ^= t
            t = st[1]
            for i in range(24):
                j = PILN[i]
                bc0 = st[j]
                st[j] = rol(t, ROTC[i])
                t = bc0
            for j in range(0, 25, 5):
                row = [st[j + i] for i in range(5)]
                for i in range(5):
                    st[j + i] ^= (~row[(i + 1) % 5]) & row[(i + 2) % 5]
            st[0] ^= RNDC[r]
        return st

    rate = 136  # 1088-bit rate for Keccak-256
    m = bytearray(msg)
    m.append(0x01)                       # keccak domain suffix
    while len(m) % rate != 0:
        m.append(0x00)
    m[-1] ^= 0x80                        # pad10*1 final bit

    st = [0] * 25
    for off in range(0, len(m), rate):
        block = m[off:off + rate]
        for i in range(rate // 8):
            st[i] ^= int.from_bytes(block[i * 8:i * 8 + 8], "little")
        keccakf(st)

    out = b"".join(st[i].to_bytes(8, "little") for i in range(rate // 8))
    return out[:32]


# ── base58check → 20-byte EVM/TVM address ────────────────────────────────────
_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def _b58decode(s: str) -> bytes:
    n = 0
    for c in s:
        n = n * 58 + _B58.index(c)
    raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
    pad = len(s) - len(s.lstrip("1"))
    return b"\x00" * pad + raw


def addr20(a: str) -> bytes:
    """Accepts a TRON base58 `T…` address or a 0x/hex 20-byte address → 20 bytes."""
    a = a.strip()
    if a.startswith("T"):
        d = _b58decode(a)
        payload, chk = d[:-4], d[-4:]
        if hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4] != chk:
            raise ValueError(f"bad base58 checksum: {a}")
        if len(payload) != 21 or payload[0] != 0x41:
            raise ValueError(f"not a TRON mainnet/testnet address: {a}")
        return payload[1:]                # strip 0x41 network byte → 20 bytes
    h = a[2:] if a.lower().startswith("0x") else a
    if a.startswith("41") and len(h) == 42:
        h = h[2:]
    b = bytes.fromhex(h)
    if len(b) != 20:
        raise ValueError(f"address must be 20 bytes, got {len(b)}: {a}")
    return b


# ── Merkle tree (leaves = index|account|amount, nodes = sorted-pair keccak) ───
def leaf_hash(index: int, address: str, amount_raw: int) -> bytes:
    return keccak256(
        index.to_bytes(32, "big") + addr20(address) + amount_raw.to_bytes(32, "big"))


def _pair(a: bytes, b: bytes) -> bytes:
    return keccak256(a + b if a <= b else b + a)   # commutative, matches OZ MerkleProof


def build_tree(leaves):
    """Return (root, layers) where layers[0] == leaves. Odd node is promoted."""
    if not leaves:
        return b"\x00" * 32, [[]]
    layers = [list(leaves)]
    while len(layers[-1]) > 1:
        cur = layers[-1]
        nxt = [_pair(cur[i], cur[i + 1]) if i + 1 < len(cur) else cur[i]
               for i in range(0, len(cur), 2)]
        layers.append(nxt)
    return layers[-1][0], layers


def proof_for(index: int, layers):
    proof, idx = [], index
    for layer in layers[:-1]:
        sib = idx ^ 1
        if sib < len(layer):
            proof.append(layer[sib])
        idx //= 2
    return proof


# ── driver ───────────────────────────────────────────────────────────────────
def load_alloc(path):
    if path.endswith(".json"):
        d = json.load(open(path))
        return int(d.get("decimals", 18)), {k: float(v) for k, v in d["claims"].items()}
    dec, claims = 18, {}
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            claims[row["address"].strip()] = float(row["amount"])
    return dec, claims


def build(decimals, claims, outdir):
    os.makedirs(outdir, exist_ok=True)
    # deterministic order: descending amount, then address — index is fixed by this
    items = sorted(claims.items(), key=lambda kv: (-kv[1], kv[0]))
    entries = []
    for i, (addr, human) in enumerate(items):
        raw = int(round(human * (10 ** decimals)))
        entries.append((i, addr, human, raw, leaf_hash(i, addr, raw)))
    root, layers = build_tree([e[4] for e in entries])

    claims_out = {}
    for (i, addr, human, raw, leaf) in entries:
        claims_out[addr] = {
            "index": i,
            "amount": str(raw),                       # base units (contract arg)
            "amountHuman": human,
            "proof": ["0x" + p.hex() for p in proof_for(i, layers)],
        }
    total_raw = sum(int(v["amount"]) for v in claims_out.values())
    out = {
        "merkleRoot": "0x" + root.hex(),
        "decimals": decimals,
        "tokenTotal": str(total_raw),
        "tokenTotalHuman": sum(e[2] for e in entries),
        "numClaims": len(entries),
        "leafEncoding": "keccak256(abi.encodePacked(uint256 index, address account, uint256 amount))",
        "claims": claims_out,
    }
    with open(os.path.join(outdir, "c74-merkle-proofs.json"), "w") as f:
        json.dump(out, f, indent=2)
    with open(os.path.join(outdir, "c74-merkle-root.txt"), "w") as f:
        f.write(out["merkleRoot"] + "\n")

    print(f"claims        {out['numClaims']}")
    print(f"tokenTotal    {out['tokenTotalHuman']:.4f} C74  ({total_raw} base units)")
    print(f"merkleRoot    {out['merkleRoot']}")
    print(f"wrote         {os.path.join(outdir, 'c74-merkle-proofs.json')}")
    print(f"              {os.path.join(outdir, 'c74-merkle-root.txt')}")

    # self-verify every generated proof against the root
    ok = 0
    for addr, c in claims_out.items():
        node = leaf_hash(c["index"], addr, int(c["amount"]))
        for p in c["proof"]:
            node = _pair(node, bytes.fromhex(p[2:]))
        if node == root:
            ok += 1
    print(f"verified      {ok}/{len(claims_out)} proofs re-check against root")
    if ok != len(claims_out):
        sys.exit("PROOF VERIFICATION FAILED")
    return out


def selftest():
    vectors = {
        b"": "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
        b"abc": "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45",
        b"The quick brown fox jumps over the lazy dog":
            "4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15",
    }
    for msg, exp in vectors.items():
        got = keccak256(msg).hex()
        assert got == exp, f"keccak256({msg!r}) = {got}, expected {exp}"
    # base58check round-trip sanity (TRON zero-ish address structure)
    a = addr20("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")   # USDT-TRC20 contract addr
    assert len(a) == 20, "addr20 length"
    # tiny known tree: two leaves, root = sorted-pair keccak
    l0 = leaf_hash(0, "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", 1000)
    l1 = leaf_hash(1, "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", 2000)
    root, layers = build_tree([l0, l1])
    assert root == _pair(l0, l1), "2-leaf root"
    # proof for leaf 0 is [l1]; verify
    node = l0
    for p in proof_for(0, layers):
        node = _pair(node, p)
    assert node == root, "2-leaf proof"
    print("selftest OK — keccak256 vectors, base58check, tree + proof all verified")


DEMO_ADDRS = [   # deterministic TRON testnet-style addresses for a runnable demo
    "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8",
    "TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb",
    "TF17BgPaZYbz8oxbjhriubPDsA7ArKoLX3",
    "TU4vEruvZwLLkSfV9bNw12EJTPvNr7Pvaa",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("alloc", nargs="?", help="allocation JSON or CSV")
    ap.add_argument("outdir", nargs="?", default=".")
    ap.add_argument("--decimals", type=int, default=None, help="override token decimals (default 18 / file value)")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--demo", metavar="OUTDIR", help="write a runnable demo tree to OUTDIR")
    a = ap.parse_args()

    if a.selftest:
        selftest(); return
    if a.demo:
        selftest()
        amounts = [3_000_000, 2_500_000, 1_200_000, 900_000, 400_000]
        build(18, dict(zip(DEMO_ADDRS, amounts)), a.demo)
        return
    if not a.alloc:
        ap.error("provide an allocation file, or use --selftest / --demo")
    dec, claims = load_alloc(a.alloc)
    if a.decimals is not None:
        dec = a.decimals
    build(dec, claims, a.outdir)


if __name__ == "__main__":
    main()
