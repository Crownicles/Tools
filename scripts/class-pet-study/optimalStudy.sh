#!/bin/bash
# Class + pet study where every class wears its optimal gear and plays its best pets (see loadoutSweep.py).
# Starting from optimal loadouts (a loadoutSweep.py output), ITERATIONS times:
#   every class + pet combination with the current gear -> best pets of each class -> optimal gear again with those pets;
# then every combination with the final gear, and the meta between the best pets of each class.
# usage: ./optimalStudy.sh <compiledCore> <workDir> <startLoadouts.json> [best|none] [level]
# Environment: FIGHTS_PER_PAIR (6), META_PER_CLASS (12), META_FIGHTS_PER_PAIR (300), GEAR_PETS (3), ITERATIONS (1),
#              EXTRA (comboRun options for a balance variant, e.g. "--set CONCENTRATED_DAMAGE_MULTIPLIER=1.55")
set -euo pipefail
CORE="$(cd "$1" && pwd)"
WORK="$(mkdir -p "$2" && cd "$2" && pwd)"
START="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
POTIONS="${4:-best}"
LEVEL="${5:-157}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CHECKOUT="$(dirname "$CORE")"
cd "$HERE"
EXTRA="${EXTRA:-}"
GEAR_PETS="${GEAR_PETS:-3}"
gear_of() {
	python3 -c "import json,sys; print(json.dumps(json.load(open(sys.argv[1]))['gearByClass']))" "$1"
}
combos() {
	# every class + pet combination with the gear of $1, report in $2.json
	node comboRun.js --core "$CORE" --gear-by-class "$(gear_of "$1")" --level "$LEVEL" --n "${FIGHTS_PER_PAIR:-6}" $EXTRA --out "$WORK/$2.json" > "$WORK/$2.log" 2>&1
	python3 comboReport.py "$WORK/$2.json" "$CHECKOUT" "$WORK/$2.data.json" > /dev/null
}
best_pets() {
	python3 - "$1" "$2" <<'EOF'
import json, sys
data, k = json.load(open(sys.argv[1])), int(sys.argv[2])
print(json.dumps({str(cl["id"]): [c["pet"] for c in sorted((x for x in data["combos"] if x["cls"] == cl["id"]), key=lambda x: -x["score"])[:k]]
                  for cl in data["classes"]}))
EOF
}
current="$START"
for it in $(seq 1 "${ITERATIONS:-1}"); do
	echo "== iteration $it: every class + pet combination"
	combos "$current" "combo$it"
	best_pets "$WORK/combo$it.data.json" "$GEAR_PETS" > "$WORK/pets$it.json"
	echo "   best pets: $(cat "$WORK/pets$it.json")"
	echo "== iteration $it: optimal gear with these pets"
	python3 loadoutSweep.py "$CORE" "$WORK/lo$it.json" --pets "$(cat "$WORK/pets$it.json")" --potions "$POTIONS" --level "$LEVEL" \
		--work "$WORK/w$it" --start "$current" --extra "$EXTRA"
	current="$WORK/lo$it.json"
done
echo "== final: every class + pet combination"
combos "$current" "final"
echo "== meta"
python3 - "$WORK/final.data.json" "${META_PER_CLASS:-12}" > "$WORK/meta_combos.json" <<'EOF'
import json, sys
data, k = json.load(open(sys.argv[1])), int(sys.argv[2])
print(json.dumps([[c["cls"], c["pet"]] for cl in data["classes"] for c in sorted((x for x in data["combos"] if x["cls"] == cl["id"]), key=lambda x: -x["score"])[:k]]))
EOF
node comboRun.js --core "$CORE" --gear-by-class "$(gear_of "$current")" --level "$LEVEL" --n "${META_FIGHTS_PER_PAIR:-300}" --pairs-per-task 8 $EXTRA \
	--combos "$(cat "$WORK/meta_combos.json")" --out "$WORK/meta.json" > "$WORK/meta.log" 2>&1
python3 metaReport.py "$WORK/meta.json" "$WORK/final.data.json" "$WORK/meta_out.json" > "$WORK/meta_report.txt"
python3 - "$WORK" <<'EOF'
import sys
work = sys.argv[1]
esc = lambda text: text.replace("</", "<\\/")
page = open("comboPage.html").read()
page = page.replace("/*DATA*/null", esc(open(f"{work}/final.data.json").read())).replace("/*META*/null", esc(open(f"{work}/meta_out.json").read()))
open(f"{work}/study.html", "w").write(page)
EOF
cp "$current" "$WORK/loadouts.json"
echo "written $WORK/study.html"
