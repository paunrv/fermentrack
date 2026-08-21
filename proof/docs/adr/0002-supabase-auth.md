# ADR 0002 — Supabase Auth, not Clerk

**Status:** accepted · Cycle 1, Step 1
**Classification:** architectural decision

## Problem

The legacy system used Clerk for identity and Supabase RLS for authorization,
bridged by a JWT template. The authorization claim `profile_type_v2` was sourced
from Clerk's **unsafe** metadata, which is writable from the browser by design.
Policies gated on that claim and never verified the user actually held the profile
they claimed. The database could not check the thing it was trusting.

## Decision

Supabase Auth. Identity lives in the same database as the RLS that must verify it.
`auth.uid()` is native, and membership is confirmed by querying `memberships`
directly rather than by trusting a claim minted elsewhere.

## Why not Clerk

Clerk is better at invitations, MFA and organization UI. Every one of those is
deferred past Cycle 1, so the advantage is currently worth nothing, while the
coupling it introduces is worth something negative. It also costs money.

Revisit if invitations, SSO or MFA become urgent — but the tenancy model must stay
in PROOF's database either way (ADR 0001).

## Consequences

No client-writable value is ever an authorization input. If a JWT claim is ever
added for RLS performance, it must be minted from a server-verified membership
lookup, and the policy must still confirm the membership exists.
