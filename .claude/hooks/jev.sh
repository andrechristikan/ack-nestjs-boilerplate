#!/usr/bin/env bash
# Jev, TypeSafe's decision model, for the coder effort. Run by the session in two places, never as a hook: ack-plan's
# level step (one ticket) and ack-review's fix list (one finding). TYPESAFE_API_KEY and JEV_ROUTER_ENABLED come from
# the environment, else from the root .env.harness (NAME=value lines, the owner's, gitignored). Calls Jev only when the
# key is set and JEV_ROUTER_ENABLED is not false; otherwise it prints an off block and the caller uses the ack-plan table.
#   level     one ticket or finding, JSON on stdin {"request","location"}: prints a <jev_level> block with the effort
#             coder runs it at.
# The question, its threshold, and the ceiling (max) live in jev.json; coder's floor is the model: and effort: of
# .claude/agents/coder.md. coder keeps its floor model and rises in effort only.
set -uo pipefail

mode="${1:-}"
payload="$(cat)"

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
harness_env="$root/.env.harness"
from_harness() {
    [ -f "$harness_env" ] || return 0
    sed -n "s/^$1=//p" "$harness_env" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}
: "${TYPESAFE_API_KEY:=$(from_harness TYPESAFE_API_KEY)}"
: "${JEV_ROUTER_ENABLED:=$(from_harness JEV_ROUTER_ENABLED)}"
export TYPESAFE_API_KEY

state=on
[ -n "${TYPESAFE_API_KEY:-}" ] || state=no-key
[ "${JEV_ROUTER_ENABLED:-true}" = "false" ] && state=disabled

config="$root/.claude/hooks/jev.json"
[ -f "$config" ] || exit 0

JEV_STATE="$state" JEV_MODE="$mode" JEV_PAYLOAD="$payload" JEV_CONFIG="$config" JEV_ROOT="$root" python3 - <<'PY'
import json, os, sys, urllib.error, urllib.request

cfg = json.load(open(os.environ["JEV_CONFIG"]))
t = cfg["thresholds"]
raw = os.environ.get("JEV_PAYLOAD") or ""
debug = os.environ.get("JEV_ROUTER_DEBUG") == "1"
fallback = "use the ack-plan table"

MODELS = ["haiku", "sonnet", "opus"]
EFFORTS = ["low", "medium", "high"]


def ask(state, questions):
    """One Jev request; returns the answers, or the failure reason as a string."""
    body = {"model": cfg["model"], "state": state, "questions": questions}
    endpoint = os.environ.get("TYPESAFE_ENDPOINT", "https://api.typesafe.ai").rstrip("/") + "/v1/systemone"
    req = urllib.request.Request(endpoint, data=json.dumps(body).encode(), headers={
        "Authorization": f"Bearer {os.environ['TYPESAFE_API_KEY']}",
        "Content-Type": "application/json",
    })
    if debug:
        print(json.dumps(body, indent=2), file=sys.stderr)
    # A failed call is reported as a failure, never read as an answer.
    try:
        with urllib.request.urlopen(req, timeout=cfg["timeout_seconds"]) as res:
            answers = json.load(res)["answers"]
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}"
    except Exception as e:
        return type(e).__name__
    if debug:
        print(json.dumps(answers, indent=2), file=sys.stderr)
    return answers


def floor(agent):
    """The model: and effort: lines of the agent's frontmatter; a missing file or line is haiku, low."""
    found = {"model": "haiku", "effort": "low"}
    try:
        lines = open(os.path.join(os.environ["JEV_ROOT"], ".claude", "agents", f"{agent}.md"), encoding="utf-8").read().splitlines()
    except OSError:
        return found
    if lines[:1] != ["---"]:
        return found
    for line in lines[1:]:
        if line.strip() == "---":
            break
        key, _, value = line.partition(":")
        value = value.strip()
        if (key == "model" and value in MODELS) or (key == "effort" and value in EFFORTS):
            found[key] = value
    return found


def at(agent, model_up, effort_up):
    """The agent at its floor, an axis raised to the ceiling when asked."""
    base, cap = floor(agent), cfg["max"]
    m = max(base["model"], cap["model"], key=MODELS.index) if model_up else base["model"]
    e = max(base["effort"], cap["effort"], key=EFFORTS.index) if effort_up else base["effort"]
    return f"{agent} ({m}, {e})"


def block(*lines):
    print("<jev_level>\n" + "\n".join(lines) + "\n</jev_level>")


def level():
    try:
        payload = json.loads(raw)
        request, location = payload["request"], payload["location"]
        if not str(request).strip() or not str(location).strip():
            raise ValueError("empty request or location")
    except (ValueError, KeyError, TypeError) as e:
        return block(f"malformed input ({type(e).__name__}: {e}); {fallback}")

    state = os.environ["JEV_STATE"]
    if state == "no-key":
        return block(f"off (TYPESAFE_API_KEY not set); {fallback}")
    if state == "disabled":
        return block(f"off (JEV_ROUTER_ENABLED=false); {fallback}")

    a = ask({"repository": cfg["repository"], "request": request, "location": location}, cfg["level_questions"])
    if isinstance(a, str):
        return block(f"unavailable ({a}); {fallback}")

    effort = a["effort"]["score"]
    hard = effort >= t["effort_high"]
    block(f"{at('coder', False, hard)}.", f"Signals: effort={effort:.1f}.")


{"level": level}.get(os.environ["JEV_MODE"], lambda: None)()
PY
