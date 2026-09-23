---
name: ack-add-status-code
description: >-
  Procedure for allocating, claiming, removing, or moving a status code: the registry
  scan, block layout, the exception class, the i18n key, and the verification greps.
  Loads when an exception is added or removed, a *.status-code.enum.ts changes, or a new
  module needs a block.
user-invocable: false
---

# Add a status code

Invariants: `.claude/rules/exceptions.md` (5-digit integer, one contiguous hundred per
owner, sequential members, enum files are the registry). Reference:
`src/modules/device/enums/device.status-code.enum.ts` and
`src/modules/device/exceptions/device.not-found.exception.ts`.

## 1. Scan first

The enum files are the machine registry. Run the scan before allocating; do not allocate
from memory or from `docs/status-codes.md`.

```bash
find src -name '*.status-code.enum.ts' | sort | while read -r f; do
  echo "== $f"
  grep -oE '= [0-9]+' "$f" | tr -d '= ' | sort -n | sed -n '1p;$p'
done
```

The output lists each owner's low and high member. Owners are feature modules under
`src/modules/` and the `src/common/` sub-trees with an enum (`src/app`, `aws`, `database`,
`file`, `helper`, `pagination`, `request`, `response`). The next free hundred is the
highest block base plus 100.

## 2. Reuse before adding

Open the owner's enum and find a member that already means the thing. Add a member only
when nothing fits; `notFound` beside `entryNotFound` is waste.

## 3. Add a member to an existing block

1. Check headroom: the next sequential number stays inside the owner's hundred. When it
   does not, stop and report.
2. Append the member at the next number, no gap, camelCase descriptor
   (`src/modules/user/enums/user.status-code.enum.ts`).
3. Create `exceptions/<module>.<descriptor>.exception.ts` from
   `src/modules/device/exceptions/device.not-found.exception.ts:9-18`: `module`,
   `statusCode` by member name, `statusCodeKey` as the reverse lookup on the same
   member, `httpStatus`, and `super('<module>.error.<descriptor>')`. Named constructor
   params go into `messageProperties`.
4. Choose `httpStatus` deliberately: it is the wire status and the Sentry switch (500 and
   above is reported).
5. Add `error.<descriptor>` to `src/languages/<lang>/<module>.json` in every language
   directory (`.claude/rules/i18n.md`).
6. Throw it from the domain, or return it from a util for the caller to throw.

## 4. Claim a block for a new module

1. Scan (step 1); take the next free hundred that overlaps no neighbour.
2. Create `src/modules/<module>/enums/<module>.status-code.enum.ts` with the first member
   at the block base (`src/modules/device/enums/device.status-code.enum.ts:5-7`).
3. Report the claim in the hand-back: module, base, next free hundred, members.

## 5. Remove a member

1. Delete the enum member and its exception file.
2. Renumber the rest of the block contiguously; references are by member name, so the
   renumber touches the enum file only.
3. Remove the i18n key from every language file.
4. Report the integer shift in the hand-back; the integer is client-visible.

## 6. Move a code between owners

Add to the destination block (step 3), delete from the source block (step 5), repoint
every exception, spec, and translation key, and report both sides.

## 7. Verify

```bash
grep -rn 'statusCode = [0-9]' src/                       # empty: members by name only
grep -rn '<descriptor>' src/modules/<module>/ src/languages/   # enum, exception, every language
pnpm typecheck
pnpm test <module>
```

Check by reading: members run from the block base without holes; every value is 5
digits; `statusCodeKey` resolves the same member as `statusCode`; the message path
resolves in every language file.

## 8. Hand back

Every number allocated, renumbered, or removed, with its module and descriptor. The human
catalog `docs/status-codes.md` is updated by `writer` from that hand-back; the enum files
stay the only machine registry.
