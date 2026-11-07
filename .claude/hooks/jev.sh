#!/usr/bin/env bash
# Jev, TypeSafe's decision model, for ack-work. Run by the session from ack-work's steps, never as a hook. Calls Jev only
# when TYPESAFE_API_KEY is set and JEV_ROUTER_DISABLED is not 1; otherwise each mode prints an off block and ack-work
# decides on its own. Every mode prints one block on stdout.
#   route     ack-work step 1, the request as raw text on stdin: prints a <jev_route> block with the route, the agents
#             dispatched before the location is known, and the next call. An empty request prints "no request"; a path
#             under .superpowers/ prints "resume <path>" and calls nothing, and so does a .superpowers/specs/ path
#             followed by a note, printed as a Note: line.
#   level     ack-work step 1, after the location is known, JSON on stdin {"request","route","location"} with route fix,
#             debug, or new_behaviour: prints a <jev_level> block with the level, the route, and each agent's model and
#             effort.
#   followup  ack-work step 8, after a route that changed files, JSON on stdin {"request","change","files","decisions"}:
#             prints a <jev_followup> block naming the docs pages writer updates, whether the harness needs a change,
#             and whether the decisions close a choice a decision record keeps.
# Questions and thresholds live in jev.json; each agent's floor is the model: and effort: of its .claude/agents/<name>.md
# frontmatter; the truth tables live here.
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
raw = os.environ.get("JEV_PAYLOAD") or ""
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


MODELS = ["haiku", "sonnet", "opus"]
EFFORTS = ["low", "medium", "high"]
LEVELS = list(zip(MODELS, EFFORTS))


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


def at(agent, level=0, model="haiku", at_least="low"):
    """The agent at the level, never below its floor on either axis, nor below model and at_least."""
    base = floor(agent)
    m = max(LEVELS[level][0], base["model"], model, key=MODELS.index)
    e = max(LEVELS[level][1], base["effort"], at_least, key=EFFORTS.index)
    return f"{agent} ({m}, {e})"


def level_of(effort):
    return 0 if effort < t["effort_sonnet"] else 1 if effort < t["effort_opus"] else 2


def block(tag, *lines):
    print(f"<{tag}>\n" + "\n".join(lines) + f"\n</{tag}>")


def gate(tag, fallback):
    """The off block when Jev is not to be called; True when it printed one."""
    state = os.environ["JEV_STATE"]
    if state == "no-key":
        block(tag, f"off (TYPESAFE_API_KEY not set); {fallback}")
    elif state == "disabled":
        block(tag, f"off (JEV_ROUTER_DISABLED=1); {fallback}")
    return state != "on"


OWNER_SKILLS = {"unit_tests": "/ack-spec", "documentation": "/ack-doc", "pull_request": "/ack-pr",
                "ai_configuration": "/ack-harness"}


def route_line(kind, cause, level):
    """The Route: line for a kind; the kind-to-route mapping lives here alone."""
    if kind in OWNER_SKILLS:
        return f"Route: owner skill {OWNER_SKILLS[kind]}. Name it to the owner and stop."
    # explore and review run at the provisional level; the other routes wait for the level call once the location is
    # known, and an agent dispatched before it runs at its floor.
    if kind == "code_question":
        return f"Route: explore. Agents: {at('explorer', level)}."
    if kind == "review":
        return f"Route: review. Agents: {at('reviewer', level)}."
    if kind == "bug_report" and cause >= t["noul_yes"]:
        return "Route: fix. Next: the pin is the location; run jev.sh level with route fix."
    if kind == "bug_report":
        return f"Route: debug. Agents: {at('debugger')}. Next: its pin is the location; run jev.sh level with route debug."
    return f"Route: pending (new_behaviour). Agents: {at('explorer')} locate. Next: run jev.sh level with route new_behaviour."


def route():
    request = raw.strip()
    fallback = "ack-work routes on its own"
    if not request:
        return block("jev_route", f"no request; {fallback}")
    # A working artifact is a resume: ack-work enters at the step the artifact proves, and Jev is not called. A design
    # path under .superpowers/specs/ may lead a note (`<path>: <note>`); the session reads it (resume.md).
    head, *note = request.split(None, 1)
    path = head.rstrip(":")
    if path.startswith(".superpowers/") or "/.superpowers/" in path:
        if not note:
            return block("jev_route", f"Route: resume {path}.")
        if ".superpowers/specs/" in path:
            return block("jev_route", f"Route: resume {path}.", f"Note: {note[0]}")
    if gate("jev_route", fallback):
        return

    a = ask({"repository": cfg["repository"], "request": request}, cfg["route_questions"])
    if isinstance(a, str):
        return block("jev_route", f"unavailable ({a}); {fallback}")

    probabilities = a["kind"]["probabilities"]
    kind = a["kind"]["choice"]
    p_kind = probabilities[kind]
    cause = a["cause_named"]["noul"]
    effort = a["effort"]["score"]
    signals = f"Signals: kind={kind} ({p_kind:.2f}), cause_named={cause:.2f}, effort={effort:.1f}."

    level = level_of(effort)
    if p_kind < t["kind_min_probability"]:
        (k1, p1), (k2, p2) = sorted(probabilities.items(), key=lambda kv: -kv[1])[:2]
        return block("jev_route", f"Route: unclear kind. Ask the owner: {k1} ({p1:.2f}) or {k2} ({p2:.2f}).",
                     f"On {k1}: {route_line(k1, cause, level)}", f"On {k2}: {route_line(k2, cause, level)}", signals)
    block("jev_route", route_line(kind, cause, level), signals)

def level():
    fallback = "ack-work decides on its own"
    try:
        payload = json.loads(raw)
        request, route_name, location = payload["request"], payload["route"], payload["location"]
        if route_name not in ("fix", "debug", "new_behaviour"):
            raise ValueError(f"route {route_name}")
        if not str(request).strip() or not str(location).strip():
            raise ValueError("empty request or location")
    except (ValueError, KeyError, TypeError) as e:
        return block("jev_level", f"malformed input ({type(e).__name__}: {e}); {fallback}")
    if gate("jev_level", fallback):
        return

    a = ask({"repository": cfg["repository"], "request": request, "location": location}, cfg["level_questions"])
    if isinstance(a, str):
        return block("jev_level", f"unavailable ({a}); {fallback}")

    effort = a["effort"]["score"]
    spans = a["spans_modules"]["noul"]
    n = level_of(effort)
    one_module = spans <= t["noul_no"]

    if route_name in ("fix", "debug"):
        # fixing a bug in existing code is high-effort work for the writer
        chain = [at("coder", n, at_least="high"), at("reviewer", n)]
    elif n == 0 and one_module:
        route_name, chain = "edit", []
    elif n == 1 and one_module:
        route_name, chain = "change", [at("coder", n), at("reviewer", n)]
    else:
        # an assessment of an open shape needs at least sonnet, medium
        route_name, chain = "feature", [at("explorer", n, model="sonnet", at_least="medium") + " assess",
                                        at("planner", n), at("coder", n), at("reviewer", n)]

    agents = ", ".join(chain) or "none, the session edits"
    block("jev_level", f"Level: {n} ({LEVELS[n][0]}, {LEVELS[n][1]}). Route: {route_name}. Agents: {agents}.",
          f"Signals: effort={effort:.1f}, spans_modules={spans:.2f}.")


def followup():
    payload = json.loads(raw or "{}")
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
    questions["decision"] = q["decision_question"]
    state = {
        "repository": cfg["repository"],
        "request": payload.get("request", ""),
        "change": payload.get("change", ""),
        "files": payload.get("files", []),
        "decisions": payload.get("decisions", ""),
    }
    a = ask(state, questions)
    if isinstance(a, str):
        print(f"<jev_followup>\nJev unavailable ({a}). Decide directly.\n</jev_followup>")
        return

    def bucket(lo, hi):
        hits = [(rel, a[f"doc:{rel}"]["noul"]) for rel in pages if lo <= a[f"doc:{rel}"]["noul"] < hi]
        return ", ".join(f"{rel} ({p:.2f})" for rel, p in sorted(hits, key=lambda x: -x[1])) or "none"

    def verdict(p):
        return "yes" if p >= t["noul_yes"] else "no" if p <= t["noul_no"] else "unsettled"

    h = a["harness"]["noul"]
    d = a["decision"]["noul"]
    print(
        "<jev_followup>\n"
        f"writer: {bucket(t['noul_yes'], 1.01)}\n"
        f"check: {bucket(t['noul_no'] + 1e-9, t['noul_yes'])}\n"
        f"harness: {verdict(h)} ({h:.2f})\n"
        f"decision: {verdict(d)} ({d:.2f})\n"
        "</jev_followup>"
    )


{"route": route, "level": level, "followup": followup}.get(mode, lambda: None)()
PY
