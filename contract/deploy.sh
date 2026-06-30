#!/usr/bin/env bash
# deploy.sh — Build and deploy the Achievo Reward Treasury contract to Stellar.
#
# Usage:
#   NETWORK=testnet SOURCE=mykey bash contract/deploy.sh
#
# Required env vars:
#   SOURCE   — stellar keys identity name (must already exist: `stellar keys ls`)
#
# Optional env vars:
#   NETWORK  — stellar network alias (default: testnet)
#   TOKEN    — SAC address of the token the treasury will hold (default: testnet XLM SAC)
#   WASM_TARGET — Rust target triple (default: wasm32v1-none, required for SDK 26+)
#
# After deploy:
#   1. Update CONTRACT_ID in frontend/src/contract.ts (line 22)
#   2. Update the contract address in README.md
#   3. Fund the treasury by sending XLM to the printed contract address

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

NETWORK="${NETWORK:-testnet}"
WASM_TARGET="${WASM_TARGET:-wasm32v1-none}"
# Testnet native XLM Stellar Asset Contract (SAC)
DEFAULT_TOKEN="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
TOKEN="${TOKEN:-$DEFAULT_TOKEN}"

if [[ -z "${SOURCE:-}" ]]; then
  echo "ERROR: SOURCE env var required (a stellar keys identity name)."
  echo "  List available keys: stellar keys ls"
  echo "  Create one:          stellar keys generate --network $NETWORK mykey"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Derive admin address ───────────────────────────────────────────────────

echo ""
echo "┌─ Deploy: Achievo Reward Treasury"
echo "│  Network : $NETWORK"
echo "│  Identity: $SOURCE"
echo "│  Token   : $TOKEN"

ADMIN_ADDRESS="$(stellar keys address "$SOURCE")"
echo "│  Admin   : $ADMIN_ADDRESS"
echo "└─"
echo ""

# ── 2. Build WASM ─────────────────────────────────────────────────────────────

echo "[1/4] Building contract (target: $WASM_TARGET)…"
cargo build --release --target "$WASM_TARGET"
WASM_PATH="target/$WASM_TARGET/release/contract.wasm"
echo "      WASM: $WASM_PATH"

# ── 3. Upload WASM to network ─────────────────────────────────────────────────

echo "[2/4] Uploading WASM…"
WASM_HASH="$(stellar contract upload \
  --network "$NETWORK" \
  --source  "$SOURCE"  \
  --wasm    "$WASM_PATH")"
echo "      Hash: $WASM_HASH"

# ── 4. Deploy contract instance ───────────────────────────────────────────────

echo "[3/4] Deploying contract instance…"
CONTRACT_ID="$(stellar contract deploy \
  --network   "$NETWORK"   \
  --source    "$SOURCE"    \
  --wasm-hash "$WASM_HASH")"
echo "      Contract ID: $CONTRACT_ID"

# ── 5. Initialize ─────────────────────────────────────────────────────────────

echo "[4/4] Initializing contract (admin=$ADMIN_ADDRESS, token=$TOKEN)…"
stellar contract invoke \
  --network  "$NETWORK"     \
  --source   "$SOURCE"      \
  --id       "$CONTRACT_ID" \
  -- initialize             \
  --admin "$ADMIN_ADDRESS"  \
  --token "$TOKEN"
echo "      Initialized."

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "✅ Deploy complete!"
echo ""
echo "   Contract ID : $CONTRACT_ID"
echo "   Explorer    : https://stellar.expert/explorer/$NETWORK/contract/$CONTRACT_ID"
echo ""
echo "Next steps:"
echo "  1. Fund the treasury:"
echo "       stellar contract invoke --network $NETWORK --source $SOURCE --id $CONTRACT_ID"
echo "       -- get_balance   # verify 0"
echo "     Then send XLM to the contract address using Stellar Laboratory or your wallet."
echo ""
echo "  2. Update CONTRACT_ID in frontend/src/contract.ts (line 22):"
echo "       CONTRACT_ID = \"$CONTRACT_ID\""
echo ""
echo "  3. Update the contract address in README.md."
echo ""
