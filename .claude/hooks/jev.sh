#!/usr/bin/env bash
# Jev, TypeSafe's decision model, answers yes-or-no questions. Run by ack-build and ack-quick, never as a hook:
#   decision <ticket path>   the coder's question, options, and recommendation as plain text on stdin. Asks Jev the two
#                            Nouls of jev.json (product, build) and prints a <jev_decision> block: advisor. when Jev is
#                            sure the item is how to build, else owner, with the reason in parentheses when Jev did not say.
#   guard <pin path>         asks Jev the three guard_questions of jev.json (schema, wire, cross) about the pin and prints a
#                            <jev_guard> block with the signals, else off., unavailable (<reason>)., or no pin given. It
#                            decides nothing: the owner does.
# TYPESAFE_API_KEY and JEV_ROUTER_ENABLED come from the environment, else from the root .env.harness (NAME=value lines,
# the owner's, gitignored). Without the key, with JEV_ROUTER_ENABLED=false, or after a failed call, the owner decides.
set -uo pipefail

mode="${1:-}"
ticket="${2:-}"
payload=""
[ "$mode" = decision ] && payload="$(cat)"

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
[ -n "${TYPESAFE_API_KEY:-}" ] || state=off
[ "${JEV_ROUTER_ENABLED:-true}" = "false" ] && state=off

config="$root/.claude/hooks/jev.json"
[ -f "$config" ] || exit 0

JEV_STATE="$state" JEV_MODE="$mode" JEV_TICKET="$ticket" JEV_PAYLOAD="$payload" JEV_CONFIG="$config" JEV_ROOT="$root" python3 - <<'PY'
import json, os, sys, urllib.error, urllib.request

cfg = json.load(open(os.environ["JEV_CONFIG"]))
t = cfg["thresholds"]
debug = os.environ.get("JEV_ROUTER_DEBUG") == "1"


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


def block(tag, *lines):
    print(f"<{tag}>\n" + "\n".join(lines) + f"\n</{tag}>")


def file_arg():
    path = os.environ["JEV_TICKET"]
    if path and not os.path.isfile(path):
        path = os.path.join(os.environ["JEV_ROOT"], path)
    return path


def decision():
    block_ = lambda *lines: block("jev_decision", *lines)
    question = (os.environ.get("JEV_PAYLOAD") or "").strip()
    path = file_arg()
    if not question or not os.path.isfile(path):
        return block_("owner (no question given).")
    if os.environ["JEV_STATE"] == "off":
        return block_("owner (off).")

    ticket = open(path, encoding="utf-8").read()
    a = ask({"repository": cfg["repository"], "ticket": ticket, "question": question}, cfg["decision_questions"])
    if isinstance(a, str):
        return block_(f"owner (unavailable: {a}).")
    try:
        product, build = float(a["product"]["noul"]), float(a["build"]["noul"])
    except (KeyError, TypeError, ValueError) as e:
        return block_(f"owner (unavailable: {type(e).__name__}).")

    if build > t["yes"] and product < t["no"]:
        route = "advisor."
    elif product > t["yes"] and build < t["no"]:
        route = "owner."
    else:
        route = "owner (unsure)."
    block_(route, f"Signals: product={product:.2f} build={build:.2f}.")


def guard():
    path = file_arg()
    if not os.path.isfile(path):
        return block("jev_guard", "no pin given.")
    if os.environ["JEV_STATE"] == "off":
        return block("jev_guard", "off.")

    pin = open(path, encoding="utf-8").read()
    a = ask({"repository": cfg["repository"], "pin": pin}, cfg["guard_questions"])
    if isinstance(a, str):
        return block("jev_guard", f"unavailable ({a}).")
    try:
        s = {k: float(a[k]["noul"]) for k in ("schema", "wire", "cross")}
    except (KeyError, TypeError, ValueError) as e:
        return block("jev_guard", f"unavailable ({type(e).__name__}).")
    block("jev_guard", f"Signals: schema={s['schema']:.2f} wire={s['wire']:.2f} cross={s['cross']:.2f}.")


{"decision": decision, "guard": guard}.get(os.environ["JEV_MODE"], lambda: None)()
PY
