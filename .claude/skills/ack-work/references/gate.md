# ack-work gate: the plan file

Every route that writes stops here before its first edit or `coder` dispatch: `edit`, `fix`, `change`, `feature`, and the fixes after a `review`. `explore` has no gate.

## 1. Write the plan file

Write `.superpowers/plans/YYYY-MM-DD-<slug>.md`, the slug kebab-case from the request; on `feature`, `planner` writes it (`feature.md`, 6.4). The gate fields, in this order:

- `**Requirement:**` the settled paragraph, out-of-scope list included. After `debug` and on `fix`, the pin (files, cause at `file:line`, change) and the symptom; after a `review`, each confirmed finding as a pin.
- `**Decisions:**` every owner answer, verbatim, one per line; `none` when the owner was asked nothing.
- `**Files:**` every path the route writes, deletes, or leaves alone.
- The names, shapes, and wording the change introduces: classes, methods, DTO fields, status codes, i18n keys and messages, config keys.
- `**Agents:**` each agent the route dispatches, with its model and effort (`SKILL.md`, Route); `none, the session works alone` on `edit`.
- `**Review depth:**` the depth `SKILL.md`, Review, gives the route.

On `feature`, the plan tasks follow the gate fields in the same file:

- One `- [ ]` task each with `Files:`, `Rules to read:` (the output of `bash .claude/hooks/rules.sh` over its Files, pasted), `Procedure:` (`references/add-<topic>.md` for a module, status code, queue, seed, or notification), and acceptance lines.
- Check that every requirement sentence has a task and no task breaks a rule its `Rules to read:` lists; a miss goes back to `planner` before asking.

## 2. Ask

- Present the plan path to the owner with `AskUserQuestion`.
- Nothing is edited and no `coder` is dispatched before the yes.
- A change request revises the file and asks again; each new owner answer joins `**Decisions:**` verbatim.

## 3. After the yes

- Every dispatch carries `Decisions:` pasted from the file (`dispatch.md`, Every dispatch).
- A `coder` dispatch takes `Task:` from the task's brief on `feature` (`feature.md`, Build); on the other routes its `Pin:` takes the files from `**Files:**` and the change from `**Requirement:**`.
- A plan with `- [x]` tasks resumes at its first `- [ ]` task; a resumed plan with no `- [x]` task re-enters Ask (`resume.md`).
