#!/bin/bash
# Class + pet study: which class beats which, which pet goes with which class, which moves are played.
# Every fighter gets the same gear and level; both sides play the king guard network.
#
# usage: ./study.sh <crowniclesCheckout> <gear> [level] [out.html]
#   <crowniclesCheckout>: a checkout whose Core is compiled (cd Core && pnpm tsc), with Core/config/*.toml and node_modules
#   <gear>: "auto" (each class picks its most suitable gear among comparable items worn in prod, see gearSweep.py),
#           or one gear for everybody: "0:weaponId:level:enchantment|1:armorId:level:enchantment|2:potionId:0:|3:objectId:0:"
# Environment: STUDY_POTIONS (none = no fight potion in "auto"), FIGHTS_PER_PAIR (6), META_PER_CLASS (12), META_FIGHTS_PER_PAIR (300), WORKERS (cores - 1)
set -euo pipefail
REPO="$(cd "$1" && pwd)"
GEAR="$2"
LEVEL="${3:-157}"
OUT="${4:-$PWD/class-pet-study.html}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${STUDY_WORK_DIR:-$HERE/.work}"
CORE="$REPO/Core"
WORKERS="${WORKERS:-$(( $(sysctl -n hw.ncpu 2>/dev/null || nproc) - 1 ))}"
mkdir -p "$WORK"
cd "$HERE"

[ -f "$CORE/dist/Core/src/core/fights/FightController.js" ] || { echo "compile the Core first: cd $CORE && pnpm tsc"; exit 1; }
[ -f "$CORE/resources/kingGuardAi/model.json" ] || { echo "no king guard model in $CORE/resources/kingGuardAi"; exit 1; }

if [ "$GEAR" = "auto" ]; then
	echo "0/4 most suitable gear of each class"
	STUDY_WORK_DIR="$WORK" python3 gearSweep.py "$REPO" "$WORK/gear.json"
	GEAR_ARGS=(--gear-by-class "$(python3 -c "import json,sys; print(json.dumps(json.load(open(sys.argv[1]))['gearByClass']))" "$WORK/gear.json")")
else
	GEAR_ARGS=(--gear "$GEAR")
fi

echo "1/4 every class + pet combination against every other one"
node comboRun.js --core "$CORE" "${GEAR_ARGS[@]}" --level "$LEVEL" --n "${FIGHTS_PER_PAIR:-6}" --workers "$WORKERS" --out "$WORK/combo.json"
python3 comboReport.py "$WORK/combo.json" "$REPO" "$WORK/data.json"

echo "2/4 the best pets of each class against each other"
python3 - "$WORK/data.json" "${META_PER_CLASS:-12}" > "$WORK/meta_combos.json" <<'EOF'
import json, sys
data, k = json.load(open(sys.argv[1])), int(sys.argv[2])
best = [[c["cls"], c["pet"]] for cl in data["classes"] for c in sorted((x for x in data["combos"] if x["cls"] == cl["id"]), key=lambda x: -x["score"])[:k]]
print(json.dumps(best))
EOF
node comboRun.js --core "$CORE" "${GEAR_ARGS[@]}" --level "$LEVEL" --n "${META_FIGHTS_PER_PAIR:-300}" --workers "$WORKERS" --pairs-per-task 8 \
	--combos "$(cat "$WORK/meta_combos.json")" --out "$WORK/meta.json"

echo "3/4 equilibrium of the meta"
python3 metaReport.py "$WORK/meta.json" "$WORK/data.json" "$WORK/meta_out.json"

echo "4/4 page"
python3 - "$WORK" "$OUT" <<'EOF'
import sys
work, out = sys.argv[1], sys.argv[2]
esc = lambda text: text.replace("</", "<\\/")
page = open("comboPage.html").read()
page = page.replace("/*DATA*/null", esc(open(f"{work}/data.json").read())).replace("/*META*/null", esc(open(f"{work}/meta_out.json").read()))
open(out, "w").write(page)
EOF
echo "written $OUT"
