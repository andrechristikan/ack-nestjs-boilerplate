#!/usr/bin/env bash
# Jev, TypeSafe's decision model, for ack-plan. Run by the session from ack-plan's level step, never as a hook. Calls Jev
# only when TYPESAFE_API_KEY is set and JEV_ROUTER_DISABLED is not 1; otherwise it prints an off block and ack-plan uses
# its own table.
#   level     one ticket, JSON on stdin {"request","location"}: prints a <jev_level> block with the effort coder runs
#             that ticket at and the model and effort reviewer runs it at.
# Questions, thresholds, and the ceiling (max) live in jev.json; each agent's floor is the model: and effort: of its
# .claude/agents/<name>.md frontmatter. coder keeps its floor model and rises in effort only; reviewer rises on both.
set -uo pipefail

mode="${1:-}"
payload="$(cat)"
state=on
[ -n "${TYPESAFE_API_KEY:-}" ] || state=no-key
[ "${JEV_ROUTER_DISABLED:-0}" = "1" ] && state=disabled

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
config="$root/.claude/hooks/jev.json"
[ -f "$config" ] || exit 0

JEV_STATE="$state" JEV_MODE="$mode" JEV_PAYLOAD="$payload" JEV_CONFIG="$config" JEV_ROOT="$root" python3 - <<'PY'
import json, os, sys, urllib.error, urllib.request

cfg = json.load(open(os.environ["JEV_CONFIG"]))
t = cfg["thresholds"]
raw = os.environ.get("JEV_PAYLOAD") or ""
debug = os.environ.get("JEV_ROUTER_DEBUG") == "1"
fallback = "ack-plan uses its table"

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
        return block(f"off (JEV_ROUTER_DISABLED=1); {fallback}")

    a = ask({"repository": cfg["repository"], "request": request, "location": location}, cfg["level_questions"])
    if isinstance(a, str):
        return block(f"unavailable ({a}); {fallback}")

    effort = a["effort"]["score"]
    spans = a["spans_modules"]["noul"]
    hard = effort >= t["effort_high"]
    # a ticket that crosses feature areas raises the reviewer alone, as the table in ack-plan gives
    wide = hard or spans >= t["noul_yes"]
    block(f"{at('coder', False, hard)}, {at('reviewer', wide, wide)}.", f"Signals: effort={effort:.1f}, spans_modules={spans:.2f}.")


{"level": level}.get(os.environ["JEV_MODE"], lambda: None)()
PY
