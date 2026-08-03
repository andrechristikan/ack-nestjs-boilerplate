# Status codes

A status code is the `statusCode` field on `AppBaseException`, surfaced in `ResponseErrorDto` beside `statusCodeKey` and `module`. It is **not** an HTTP status — `httpStatus` is a separate field.

**The enum files are the machine registry.** Scan them before allocating; never invent a number from memory. This rule file is the procedure and the human layout. Durable prose about error *behavior* stays in `docs/handling-error.md` / `docs/message.md`. The full human catalog of every code is `docs/status-codes.md`.

```bash
find src -name '*.status-code.enum.ts' | sort | while read -r f; do
  echo "== $f"
  grep -oE '= [0-9]+' "$f" | tr -d '= ' | sort -n | sed -n '1p;$p'
done
```

---

## Digit width (HARD)

| Rule | Detail |
|---|---|
| **Every status code is 5 digits** | `51000`, `52014` — never a 4-digit (or other-width) value |
| **Module blocks are 5-digit hundreds** | Contiguous hundred per owner (e.g. `53000`–`53099`) |
| **No other width** | Do not allocate outside the 5-digit hundred layout |

---

## Current layout (snapshot — verify by scan)

| Range | Owner |
|---|---|
| `50000` | `src/app` — `EnumAppStatusCodeError` |
| `50100`–`50103` | `src/common/file` |
| `50200`–`50215` | `src/common/pagination` |
| `50300`–`50303` | `src/common/request` |
| `50400`–`50401` | `session` |
| `50500`–`50504` | `role` |
| `50600`–`50605` | `feature-flag` |
| `50700`–`50707` | `api-key` |
| `50800`–`50814` | `auth` |
| `50900`–`50903` | `country` |
| `51000`–`51026` | `user` |
| `51100`–`51101` | `policy` |
| `51200`–`51203` | `notification` |
| `51300` | `device` |
| `51400` | `src/common/aws` |
| `51500`–`51508` | `term-policy` |

| Note | Detail |
|---|---|
| Next free hundred | `51600` (verify by scan before claiming) |
| Prefer | `5xxxx` for feature modules |

---

## Before anything — reuse?

| Step | Action |
|---|---|
| 1 | Open the module's existing `*.status-code.enum.ts` |
| 2 | Find a member that already means what you need |
| 3 | Add a new member only when nothing fits |

Duplicate near-synonyms (`notFound` beside `entryNotFound`) are waste.

---

## Add a member (existing block)

| Step | Action |
|---|---|
| 1 | Scan (command above) — real low/high and neighbour base |
| 2 | Check headroom — stop and report if the next number collides |
| 3 | Append the next sequential number — no gaps |
| 4 | Name = bare camelCase descriptor (`notFound`, `passwordExpired`) |
| 5 | Create one exception class file under `exceptions/` |
| 6 | Add nested i18n key in **every** `src/languages/<lang>/<module>.json` |
| 7 | Pick `httpStatus` deliberately (wire status **and** Sentry predicate: filter reports at 500+) |
| 8 | Record the change in `generated/docs/report-coder-<feature>.md` for the owner |

Exception shape:

```ts
export class <Module><Descriptor>Exception extends AppBaseException {
    readonly module = '<module>';
    readonly statusCode = Enum<Module>StatusCodeError.<descriptor>;
    readonly statusCodeKey = Enum<Module>StatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.<MATCHING>;

    constructor() {
        super('<module>.error.<descriptor>');
    }
}
```

---

## Claim a block (new module)

| Step | Action |
|---|---|
| 1 | Scan — highest allocated block and gaps |
| 2 | Take the next free **5-digit** hundred that does not overlap a neighbour |
| 3 | Create `enums/<module>.status-code.enum.ts` with the first member at the block base |
| 4 | Report the claim in `generated/docs/report-coder-<feature>.md` (module, base, next free, members) |

---

## Remove a member

| Step | Action |
|---|---|
| 1 | Delete the enum member and its exception file |
| 2 | Renumber the rest of the block contiguously (by member name references) |
| 3 | Remove the i18n key from every language file |
| 4 | Report the client-visible integer shift in `generated/docs/report-coder-<feature>.md` |

Clients should key on `module` + `statusCodeKey`, not the raw integer.

---

## Move a code between modules

| Step | Action |
|---|---|
| 1 | Add to the destination block (sequential + i18n) |
| 2 | Delete from the source block and renumber that block |
| 3 | Repoint every exception, spec, and translation key |
| 4 | Report the contract change on **both** sides |

---

## Verify

| Check | Command / reading |
|---|---|
| No numeric literals | `grep -rn 'statusCode = [0-9]' src/` — must be empty |
| Member used | `grep -rn '<descriptor>' src/modules/<module>/ src/languages/` |
| Contiguous | Members run from block base without holes |
| Key matches number | `statusCodeKey` reverse-looks-up the same member as `statusCode` |
| i18n nested | `messagePath` resolves in every language file |
| Digit width | Every value is 5 digits |

Record block claims and renumbers in `generated/docs/report-coder-<feature>.md`. Quoted numbers in `docs/*.md` (including the catalog `docs/status-codes.md`) are updated from that report — the enum files remain the only machine registry.
