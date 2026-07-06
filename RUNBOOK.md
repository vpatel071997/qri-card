# Operations runbook — keeping printed cards alive

Customers print QriCard QR codes onto physical cards. A QR shared via **Copy
link** points at `https://qr.synivo.com.au/vcard-view?…` (or `/link?…`), so its
survival depends on the domain, the hosting, the routes, and the encoding format
staying intact. This runbook lists what must never break, and how to check.

> Note: the QR **image you download** encodes the data directly (plain-text
> contact for v-cards, the raw URL for links). Those are self-contained and
> cannot be broken by app changes. Everything below is about the **shared link**
> path — the one that hits our servers.

## Must never break

| Area | Rule | If it breaks |
| --- | --- | --- |
| **Domain** | Keep `qr.synivo.com.au` registered with **auto-renew on**; keep DNS pointing at Cloudflare Pages. | Every shared-link QR dies. |
| **Hosting** | Do **not** delete or rename the Cloudflare Pages project `qri-card`; keep the custom domain bound and HTTPS on. | Every shared-link QR dies. |
| **Routes** | Never rename/remove `/vcard-view` or `/link` in `src/App.tsx`; keep the SPA fallback in `public/_redirects` (`/*  /index.html  200`). | Deep links 404. |
| **Encoding** | Never change the wire format — see [`CLAUDE.md`](./CLAUDE.md) and the frozen files `src/utils/vcard.ts`, `src/utils/vCardFields.tsx`, `src/utils/vcardTemplates.ts`. | Old cards decode to the wrong data / nothing. |
| **lz-string** | Keep it pinned (via `package-lock.json`). A major-version bump can change token output. | Old `?data=` tokens stop decoding — CI golden test catches this. |

## Guardrails already in place

- **Golden-fixture tests** lock the encode/decode format and field-id mapping
  (`src/utils/vcard.test.tsx`, `vCardFields.test.tsx`, `vcardTemplates.test.tsx`).
- **Route + component tests** guard the paths and the SPA fallback
  (`src/App.test.tsx`, `VCardView.test.tsx`, `LinkRedirect.test.tsx`).
- **CI gate**: the deploy pipeline runs the test job first and **blocks deploy**
  on any failure (`.gitea/workflows/deploy-pages.yml`).

## Before merging a change that touches format, routes, or infra

1. `npm ci --omit=optional --omit=dev && npm test -- --watchAll=false && npm run build`
   (this is exactly what CI runs).
2. Scan a **previously printed** card / a saved old share link and confirm it
   still opens correctly.
3. If a golden-fixture test fails, **do not edit the fixture** to make it pass —
   that means the change breaks cards in the wild. Revert, or plan a migration.

## If cards stop working (incident triage)

1. **Domain / DNS** — does `https://qr.synivo.com.au/` load at all? Check the
   registrar (expiry/renewal) and DNS records.
2. **Hosting** — is the Cloudflare Pages `qri-card` project present, deployed,
   and is the custom domain still bound with a valid certificate?
3. **Routes** — did a recent deploy rename a route or drop `public/_redirects`?
   Open a shared link directly (not the SPA root) to test the fallback.
4. **Format** — did a recent change touch the frozen encoding files? Re-run the
   golden tests against the failing token.
