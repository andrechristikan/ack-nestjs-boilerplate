# Add a status code

Invariants: `.claude/rules/exception-class.md`, `.claude/rules/exceptions.md` (5-digit integer, one contiguous hundred per owner, sequential members). Reference: `src/modules/device/enums/device.status-code.enum.ts` and `src/modules/device/exceptions/device.not-found.exception.ts`.

## 1. Scan first

The enum files are the machine registry. Run the scan before allocating; do not allocate from memory or from `docs/reference/status-codes.md`.

```bash
find src -name '*.status-code.enum.ts' | sort | while read -r f; do
  echo "== $f"
  grep -oE '= [0-9]+' "$f" | tr -d '= ' | sort -n | sed -n '1p;$p'
done
```

The output lists each owner's low and high member; a number printed twice is a one-member block. Owners are feature modules under `src/modules/` and the `src/common/` sub-trees with an enum (`src/app`, `aws`, `database`, `file`, `firebase`, `helper`, `pagination`, `redis`, `request`, `response`). The free hundreds are the hundreds from `50000` up that no owner's low-to-high range touches; the next free hundred is the lowest of them.

## 2. Reuse before adding

Open the owner's enum and find a member that already means the thing. Add a member only when nothing fits; `notFound` beside `entryNotFound` is waste.

## 3. Add a member to an existing block

1. Check headroom: the next sequential number stays inside the owner's hundred. When it does not, stop and report.
2. Append the member at the next number, no gap, named by its descriptor (`src/modules/user/enums/user.status-code.enum.ts`).
3. Create `exceptions/<module>.<descriptor>.exception.ts` from `DeviceNotFoundException` (`src/modules/device/exceptions/device.not-found.exception.ts`).
4. Choose `httpStatus` as `.claude/rules/exceptions.md`, The hierarchy, gives.
5. Add `error.<descriptor>` to `src/languages/<lang>/<module>.json` in every language directory (`.claude/rules/i18n.md`).
6. Throw it from the service, or return it from a util for the caller to throw.

## 4. Claim a block for a new module

1. Scan and take the next free hundred (step 1).
2. Create `src/modules/<module>/enums/<module>.status-code.enum.ts` with the first member at the block base (`EnumDeviceStatusCodeError`, `src/modules/device/enums/device.status-code.enum.ts`).
3. Report the claim in the hand-back: module, base, members, and the next free hundred after this claim.

## 5. Remove a member

1. Delete the enum member and its exception file.
2. Renumber the rest of the block contiguously; references are by member name, so the renumber touches the enum file only.
3. Remove the i18n key from every language file.
4. Report the integer shift in the hand-back; the integer is client-visible.

## 6. Move a code between owners

Add to the destination block (step 3), delete from the source block (step 5), repoint every exception, spec, and translation key, and report both sides.

## 7. Verify

```bash
grep -rn 'statusCode = [0-9]' src/                       # empty: members by name only
grep -rn '<descriptor>' src/modules/<module>/ src/languages/   # enum, exception, every language
pnpm typecheck
pnpm test <module>
```

Check by reading: members run from the block base without holes; every value is 5 digits; `statusCodeKey` resolves the same member as `statusCode`; the message path resolves in every language file.

## 8. Hand back

Every number allocated, renumbered, or removed, with its module and descriptor. The human catalog `docs/reference/status-codes.md` is updated by `writer` from that hand-back; the enum files stay the only machine registry.
