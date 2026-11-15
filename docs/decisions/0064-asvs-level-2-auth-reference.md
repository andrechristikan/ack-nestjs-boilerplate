# 0064. OWASP ASVS level 2 is the auth reference

- Status: accepted
- Date: 2026-11-15

## Context

The auth flows needed one named bar to judge each control against; without one, every control was argued case by case.

## Decision

OWASP ASVS 5.0 level 2 is the reference for every auth flow. In the auth area a control it requires is in scope even when only an attacker reaches its case.

## Considered options

- ASVS 5.0 level 2 (chosen)
- ASVS level 3: rejected, its hardware-backed factors and extra controls exceed what a general boilerplate ships.
- NIST SP 800-63B alone: rejected, it states assurance levels, not checkable application requirements.
- no named standard: rejected, each control would be argued with no common bar.

## Consequences

`discipline.md`, Boilerplate stance and Normal use, carries it.
