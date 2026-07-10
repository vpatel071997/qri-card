# QriCard — agent guide

A React (CRA) + TypeScript app that generates QR codes for links and shareable
digital v-cards. Also ships as an Electron desktop app. Deployed to Cloudflare
Pages via `.gitea/workflows/deploy-pages.yml`.

## ⚠️ The printed-card contract — read before touching encoding

Customers **print QR codes onto physical cards**. Those codes encode a URL that
this app must keep decoding correctly _forever_. If you change the wire format,
every card already in the wild breaks — and there is no way to reissue them.

The contract lives in three files. Treat them as append-only / frozen:

- `src/utils/vcard.ts` — how v-card data is compressed into `?data=…` and the
  `/link?url=…` redirect format. **Single source of truth**; both the generator
  (`QRGenerator`) and the viewer (`VCardView`) import it. Never inline a second
  copy of this logic.
- `src/utils/vCardFields.tsx` — the field `id → name` mapping. Ids are baked
  into every printed code. **Adding** a new field with a new id is safe.
  **Changing or removing** an existing id/name pair is a breaking change.
- `src/utils/vcardTemplates.ts` — template ids stored as the `?t=…` param.
  Existing ids must not change. `classic` is the default and is deliberately
  omitted from URLs so pre-template cards keep working.

These invariants are locked by golden-fixture tests:
`vcard.test.tsx`, `vCardFields.test.tsx`, `vcardTemplates.test.tsx`,
`VCardView.test.tsx`.

**If one of these tests fails, do NOT edit the fixture to make it pass.** A
failure means your change would break printed cards. Either revert the change,
or — if the format change is genuinely intended — update the fixture
deliberately _with a migration plan for cards already in circulation_, and say
so explicitly in the PR.

Backward-compatibility rules already relied on in production:

- A missing `?t=` param must resolve to the `classic` template.
- `VCardView` still supports the legacy plain-query format (`?firstName=…`).
- Decoding a corrupt/absent token must degrade gracefully (render "Contact"),
  never throw.
- The `/vcard-view` and `/link` routes and the `public/_redirects` SPA fallback
  must keep existing — a shared-link QR 404s without them. Guarded by
  `src/App.test.tsx`.

Beyond code, printed cards also depend on the domain, hosting, and routes
staying alive — see [`RUNBOOK.md`](./RUNBOOK.md) for the ops checklist and
incident triage.

## Commands

- `npm start` — dev server
- `npm test -- --watchAll=false` — run the suite once (CI mode)
- `npm run build` — production build (CRA)
- `npm run lint` — Prettier write · `npm run lint:check` — Prettier check

## CI / dependency constraints

- CI installs with `npm ci --omit=optional --omit=dev`. Do **not** add a
  dependency that relies on **optional** peer/dynamic imports at build time
  (this is why `jspdf` was removed — it dynamically imported `canvg`). Every
  export writer is hand-rolled and dependency-free — follow that pattern rather
  than pulling a library for a new format:
  - `src/utils/pdf.ts` — single-QR PDF **and** the multi-page A4 Avery
    label-sheet PDF (verbatim JPEG via `/DCTDecode`).
  - `src/utils/zip.ts` — STORE (no-compression) ZIP + CRC-32, used for batch
    downloads (this is why `jszip` was avoided).
  - `src/utils/eps.ts` — PostScript/EPS (JPEG via `/DCTDecode`) for print shops.
- Test libraries live in `dependencies` (not `devDependencies`) on purpose, so
  the `--omit=dev` install still runs the test gate. Keep it that way.
- The deploy pipeline has a `test` job that **blocks deploy** on failure. Any
  new feature touching the card format must ship with tests.
- After a nontrivial change, verify with the real CI install before pushing:
  `npm ci --omit=optional --omit=dev && npm run build`.

## Routes

- `/`, `/url-to-qr`, `/vcard-gen` → `QRGenerator` (the builder, with chrome)
- `/batch` → `BatchGenerator` (bulk CSV → many QRs; ZIP + Avery label-sheet PDF)
- `/vcard-view?data=…&t=…` → `VCardView` (what a scanner opens; chromeless)
- `/link?url=…` → `LinkRedirect` (redirects the visitor; chromeless)

## Feature map

Builder logic is factored into pure, unit-tested utils so the components stay
thin and behaviour is testable without a DOM. **None of these features change
the printed-card wire format** — they only affect the visual render and the
downloaded file; the `?data=…` / `/link?url=…` contract above is untouched.

- `utils/qrOptions.ts` — design → qr-code-styling options (logo auto-raises
  error correction to H, gradient fills, separate corner/eye colour).
- `utils/scannability.ts` — WCAG contrast → scannability verdict/warning.
- `utils/designUrl.ts` — encode/decode the whole builder state into a shareable
  `?…=` editor link (v-card compressed with lz-string; a logo is deliberately
  omitted — data URLs are too large for a URL).
- `utils/recents.ts` — localStorage "recent codes" history.
- `utils/csv.ts` — parse the batch list (CSV or one-per-line, header auto-skip,
  filename-safe de-dupe).
- `components/PageInfoSections.tsx` — shared Help / About / Disclaimer plus the
  `qricard:open-help` header-button + `#help` deep-link listener; used by both
  the single (`QRGenerator`) and batch (`BatchGenerator`) pages.

Cross-page nav uses react-router `<Link>` (client-side, no reload); `.qr-app`
plays a `pageIn` animation on mount, so a Single↔Bulk switch animates.
