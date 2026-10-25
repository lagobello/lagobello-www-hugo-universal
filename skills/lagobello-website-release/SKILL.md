---
name: lagobello-website-release
description: "Integrate and verify approved website releases."
version: 0.1.1
author: Vittorio, with Hermes Agent
---

# Lago Bello website integration and release

## When to Use
Use to recover feature-branch work, integrate a site change or verify an approved release of this website. Hosting this skill in a public source repo requires public-safe content only. Local Hermes preview/proxy instructions stay local.

## Prerequisites
- Confirm the checkout is this website, inspect README, package scripts, Hugo configuration and submodules.
- Inspect current branch/status and preserve unrelated work. Verify the actual production branch; existing source procedures use `master`.
- Identify the approved scope: offline preparation, cloud branch preview or production push. A push can trigger a deployment; do not treat it as harmless documentation storage.
- Use the shared cloud deployment procedure for account/zone authorization, build target, domain and hosting checks. This project skill adds source-specific integration behavior; it does not duplicate provider management.

## Procedure
1. **Inspect current production truth.** Fetch within authorized read scope and compare production head, feature-branch containment and merge base. A feature pushed remotely but absent from live pages may be unmerged, not lost. Record facts before proposing recovery.
2. **Integrate safely.** Create an integration branch from current production. When recovering an identified feature branch, integrate its complete relevant work rather than cherry-picking only the visible content change. Preserve current production fixes during conflicts.
3. **Protect invariants.** Keep existing approved public contact links, newer lot-card/listing behavior, accessibility labels and analytics/consent configuration. Do not remove GTM/Meta tracking or change public claims as a side effect. Resolve private/public contact configuration from approved company sources; do not add private contacts here.
4. **Test the actual revision.** Inspect and run existing `npm test`, the supported Hugo production build (source procedure uses `hugo --minify`) and `git diff --check`. Match the project's required Hugo version rather than pinning a historical local version. Initialize required submodules and record actual output.
5. **Inspect rendered results.** Verify changed routes, links, images, styles, data endpoints, lot listing behavior and contact/analytics invariants. For calculator changes verify current module loading and real data behavior; do not assert historical marker strings prove today's feature. Use browser checks where the change requires interaction.
6. **Cloud preview when approved/requested.** Push only the approved integration branch, inspect the exact commit's hosting checks and test its preview routes/assets. A green build or pushed commit alone is insufficient.
7. **Production only with explicit approval.** Preserve the owner's preview-first convention. If direct production push is expressly approved, use the verified revision; do not force a PR workflow or force-push history. Confirm the remote production SHA and hosting result.
8. **Read back live pages.** Verify intended positive markers, absence of regressions and direct asset responses on the actual production hostname, using cache-busting where needed. If Actions shows no new run, inspect the hosting integration rather than assuming failure. Report revision, build, preview, deployment and live checks distinctly.

## Read-only verification and revision matching

- For an audit, do not push, deploy, trigger CI, initialize or fetch into a protected source checkout. Use remote read APIs and an isolated full copy for build outputs, caches and any dependency work.
- Record local HEAD and remote production SHA separately. When compare APIs cannot resolve local history, compare tracked blob trees; never assume a clean local checkout matches production. Obtain differing source blobs at the pinned remote SHA in the isolated copy and rerun the applicable tests/build. Report omitted documentation-only additions explicitly.
- Preserve dependency symlinks when copying installed dependencies. Exclude generated site output without globally excluding dependency package directories such as `dist`; an incomplete copy can create false build failures. Record harness failures separately from source defects.
- Derive asset and data routes from current source/rendered references, not guessed names. Check returned content type as well as status. Retry an isolated HTTP denial once with an identified audit user agent or the exact deployment hostname; preserve the initial result rather than declaring an unobserved cause.
- Local model/fixture tests and static asset responses do not establish interactive browser behavior, real external API data retrieval or conversion delivery. Do not click tracking/contact controls during read-only verification.

## Pitfalls
- Never use destructive reset to bypass a blocked recovery path or erase unrelated work.
- Local preview configuration and host paths do not belong in this portable source skill.
- Branch deletion requires explicit scope; successful production verification is not blanket cleanup authorization.
- Company operational records, account secrets, historical availability counts and private contacts stay outside this public repo.

## Verification
- Tests/build/diff checks apply to the precise candidate revision.
- Public-contact, lot-data and tracking behavior were preserved or changed only within approval.
- A production claim is supported by remote SHA, hosting result and live behavior, not build output alone.
