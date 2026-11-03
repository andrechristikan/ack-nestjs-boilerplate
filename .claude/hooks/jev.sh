#!/usr/bin/env bash
# Jev, TypeSafe's decision model, for ack-work. Calls Jev only when TYPESAFE_API_KEY is set and JEV_ROUTER_DISABLED is
# not 1; otherwise ack-work decides on its own.
#   route     UserPromptExpansion hook on /ack-work: judges the request and injects a <jev_route> reminder naming the
#             route and each agent's model and effort. Every /ack-work also shows the owner one "Jev:" line: the route,
#             off, unavailable, or no clear route.
#   followup  run by ack-work after a route that changed files, JSON on stdin {"request","change","files"}: prints a
#             <jev_followup> block naming the docs pages writer updates and whether the harness needs a change.
# Questions, thresholds, and per-agent floors live in jev.json; the truth tables live here.
set -uo pipefail

mode="${1:-}"
payload="$(cat)"
state=on
[ -n "${TYPESAFE_API_KEY:-}" ] || state=no-key
[ "${JEV_ROUTER_DISABLED:-0}" = "1" ] && state=disabled
[ "$mode" = followup ] && [ "$state" != on ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
config="$root/.claude/hooks/jev.json"
[ -f "$config" ] || exit 0

JEV_STATE="$state" JEV_MODE="$mode" JEV_PAYLOAD="$payload" JEV_CONFIG="$config" JEV_ROOT="$root" python3 - <<'PY'
import glob, json, os, sys, urllib.error, urllib.request

cfg = json.load(open(os.environ["JEV_CONFIG"]))
t = cfg["thresholds"]
mode = os.environ["JEV_MODE"]
payload = json.loads(os.environ.get("JEV_PAYLOAD") or "{}")
debug = os.environ.get("JEV_ROUTER_DEBUG") == "1"


def ask(state, questions):
    """One Jev request; returns the answers, or the failure as a string."""
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
        return f"Jev unavailable (HTTP {e.code}). Decide directly."
    except Exception as e:
        return f"Jev unavailable ({type(e).__name__}). Decide directly."
    if debug:
        print(json.dumps(answers, indent=2), file=sys.stderr)
    return answers


def route():
    if payload.get("command_name") != "ack-work":
        return
    request = (payload.get("command_args") or "").strip()
    if len(request) < cfg["min_request_chars"]:
        return print(json.dumps({"systemMessage": "Jev: request too short to judge; /ack-work routes on its own"}))

    def emit(shown, text=None):
        # systemMessage is the owner's "Jev:" line; additionalContext is the reminder ack-work reads
        out = {"systemMessage": f"Jev: {shown}"}
        if text:
            out["hookSpecificOutput"] = {
                "hookEventName": "UserPromptExpansion",
                "additionalContext": f"<jev_route>\n{text}\n</jev_route>",
            }
        print(json.dumps(out))

    state = os.environ["JEV_STATE"]
    if state == "no-key":
        return emit("off (TYPESAFE_API_KEY not set); /ack-work routes on its own")
    if state == "disabled":
        return emit("off (JEV_ROUTER_DISABLED=1); /ack-work routes on its own")

    a = ask({"repository": cfg["repository"], "request": request}, cfg["route_questions"])
    if isinstance(a, str):
        return emit(a.replace("Jev unavailable", "unavailable").replace(". Decide directly.", "; /ack-work routes on its own"), a)

    yes = lambda name: a[name]["noul"] >= t["noul_yes"]
    no = lambda name: a[name]["noul"] <= t["noul_no"]
    unsettled = "no clear route; /ack-work routes on its own"
    if not yes("is_repo_task"):
        return emit(unsettled)
    kind = a["kind"]["choice"]
    p_kind = a["kind"]["probabilities"][kind]
    if p_kind < t["kind_min_probability"]:
        return emit(unsettled)

    signals = (
        f"Signals: kind={kind} ({p_kind:.2f}), effort={a['effort']['score']:.1f}, "
        f"cause_named={a['cause_named']['noul']:.2f}, spans_modules={a['spans_modules']['noul']:.2f}."
    )
    owner_skills = {"unit_tests": "/ack-spec", "documentation": "/ack-doc", "pull_request": "/ack-pr",
                    "ai_configuration": "/ack-harness"}
    if kind in owner_skills:
        return emit(f"owner skill {owner_skills[kind]}",
                    f"Route: owner skill {owner_skills[kind]}. Name it to the owner and stop.\n{signals}")

    # The effort Score picks a level; each level is a model and an effort. An agent never runs below its floor.
    levels = [("haiku", "low"), ("sonnet", "medium"), ("opus", "high")]
    models = [m for m, _ in levels]
    efforts = ["low", "medium", "high"]
    effort = a["effort"]["score"]
    level = 0 if effort < t["effort_sonnet"] else 1 if effort < t["effort_opus"] else 2

    def at(agent, model=None, effort_level=None, at_least="low"):
        floor = cfg["floors"].get(agent, {"model": "haiku", "effort": "low"})
        m = max(model or levels[level][0], floor["model"], key=models.index)
        e = max(effort_level or levels[level][1], floor["effort"], at_least, key=efforts.index)
        return f"{agent} ({m}, {e})"

    if kind == "bug_report" and yes("cause_named"):
        # fixing a bug in existing code is high-effort work for the writer
        route_name, chain = "fix", [at("coder", at_least="high"), at("reviewer")]
    elif kind == "bug_report":
        route_name, chain = "debug", [at("debugger"), at("coder", at_least="high"), at("reviewer")]
    elif kind == "new_behaviour" and level == 0 and no("spans_modules"):
        route_name, chain = "edit", []
    elif kind == "new_behaviour" and level < 2 and no("spans_modules"):
        # locate is a text search: explorer stays on haiku at low effort
        route_name, chain = "change", [at("explorer", model="haiku", effort_level="low"), at("coder"), at("reviewer")]
    elif kind == "new_behaviour":
        route_name, chain = "feature", [at("explorer", model=max(levels[level][0], "sonnet", key=models.index), at_least="medium"), at("coder"), at("reviewer")]
    elif kind == "review":
        route_name, chain = "review", [at("reviewer")]
    else:
        # a code question: a text search runs on haiku, a contract or an assessment climbs with effort
        route_name, chain = "explore", [at("explorer")]

    agents = ", ".join(chain) or "none, the session works alone"
    emit(
        f"{route_name}, {agents}",
        f"Route: {route_name}. Agents: {agents}.\n{signals}\n"
        "Pass each agent's model and effort as its Agent model and effort. "
        "Ignore this reminder when it does not fit the request."
    )


def followup():
    root = os.environ["JEV_ROOT"]
    skip = set(cfg["followup"]["generic_headings"])
    pages = {}
    for path in sorted(glob.glob(os.path.join(root, "docs", "*.md"))) + [os.path.join(root, "README.md")]:
        lines = open(path, encoding="utf-8").read().splitlines()
        rel = os.path.relpath(path, root)
        title = next((l[2:].strip() for l in lines if l.startswith("# ")), rel)
        sections = [l[3:].strip() for l in lines if l.startswith("## ") and l[3:].strip() not in skip]
        pages[rel] = {"path": rel, "title": title, "sections": sections[:12]}

    q = cfg["followup"]
    questions = {f"doc:{rel}": {"type": "noul", "instructions": {"question": q["doc_question"], "page": page}}
                 for rel, page in pages.items()}
    questions["harness"] = q["harness_question"]
    state = {
        "repository": cfg["repository"],
        "request": payload.get("request", ""),
        "change": payload.get("change", ""),
        "files": payload.get("files", []),
    }
    a = ask(state, questions)
    if isinstance(a, str):
        print(f"<jev_followup>\n{a}\n</jev_followup>")
        return

    def bucket(lo, hi):
        hits = [(rel, a[f"doc:{rel}"]["noul"]) for rel in pages if lo <= a[f"doc:{rel}"]["noul"] < hi]
        return ", ".join(f"{rel} ({p:.2f})" for rel, p in sorted(hits, key=lambda x: -x[1])) or "none"

    h = a["harness"]["noul"]
    harness = "yes" if h >= t["noul_yes"] else "no" if h <= t["noul_no"] else "unsettled"
    print(
        "<jev_followup>\n"
        f"writer: {bucket(t['noul_yes'], 1.01)}\n"
        f"check: {bucket(t['noul_no'] + 1e-9, t['noul_yes'])}\n"
        f"harness: {harness} ({h:.2f})\n"
        "</jev_followup>"
    )


{"route": route, "followup": followup}.get(mode, lambda: None)()
PY
