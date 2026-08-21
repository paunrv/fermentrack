# ADR 0003 — No lot state machine during Cycle 1

**Status:** accepted, **temporary** · Cycle 1
**Classification:** architectural decision, deliberately deviating from a guardrail

## Problem

The guardrails require explicit state machines on important resources, and a wine
lot will eventually need one. But we do not yet know the valid transitions at
Viñas del Tigre. Harvest is running, and a wrong state machine refuses a
legitimate operation at the worst possible moment — in front of the user, mid-work.

## Decision

For Cycle 1 a lot carries a **soft stage label** the winemaker sets. PROOF enforces
no transitions. The words used are recorded verbatim, because that vocabulary is a
finding.

## Expiry

This deviation ends when field cycles have shown which sequences actually occur.
Transitions are then hardened from observed reality rather than from a guess.

It is recorded here so it does not become permanent by accident, which is how most
temporary architecture becomes permanent architecture.
