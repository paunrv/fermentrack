# ADR 0001 — The organization is the tenant

**Status:** accepted · Cycle 1, Step 1
**Classification:** architectural decision

## Problem

The legacy system (`fermentrack`) made the tenant `(clerk_id, profile_type_v2)` — a
single user wearing a single hat. A second employee at the same winery could not
exist, because there was no entity for the company for two people to both belong to.
Adding one was not a migration but a rewrite of every table, policy and function.

## Decision

`organization_id` is a `not null` foreign key on every tenant-scoped table.
Tenancy is never derived from the identity provider's user id.

A user reaches organization data only through an **active** membership row in an
**active** organization. Every authorization question is asked through one of two
functions — `app.is_member_of()` and `app.has_org_role()` — and through no other
means.

## Why not the alternatives

**Schema per tenant** gives stronger isolation but multiplies migrations per tenant
and makes platform-wide queries painful. Not worth it below hundreds of large
tenants.

**Delegating organizations to the auth provider** ships faster but places the
tenancy boundary inside a vendor, where the database cannot independently verify
it. That is structurally the same mistake the legacy system made.

## Consequences

Multi-tenancy is not retrofittable, so it is present in the first migration and
proved by a test before any feature is built on top of it. A per-function
authorization convention is what failed before; a single canonical implementation
is the correction.
