<h1 align="center">
 QriCard.
</h1>

<h3 align="center">Qri Card - Simple solution to generate and download QR codes for any URL for FREE.</h3>

<p align="center">

 <img alt="Status" src="https://img.shields.io/badge/status-In Production-green">

  <img alt="Latest Version" src="https://img.shields.io/badge/latest version-1.1.0-2e7f74">
  
  <img alt="License" src="https://img.shields.io/badge/license-MIT-d52536">

  <a href="https://github.com/vpatel071997">
    <img alt="made by Vaibhav Patel" src="https://img.shields.io/badge/made%20by-Vaibhav%20Patel-116ed0">
  </a>
</p>

## Features

- **Link → QR** — generate a styled QR code for any URL.
- **V-card → QR** — fill in contact details, pick a card template, and share a
  QR that opens a hosted contact page with one-tap **Add to Contacts** (`.vcf`).
- **Design** — frames, dot & corner (eye) shapes, colours, gradient fills, a
  center logo (auto-raises error correction), and a live scannability/contrast
  guard that warns when a code may not scan.
- **Batch / bulk** (`/batch`) — paste or upload a CSV of `name,link` rows and
  download every QR at once as a **ZIP**, or a print-ready **Avery label-sheet
  PDF**.
- **Export options** — PNG, SVG, PDF and **EPS**; 256–2048 px resolution,
  transparent background, and copy-to-clipboard.
- **Share & resume** — a shareable editor link restores the exact design, and a
  locally-saved "recent codes" list lets you jump back.

Everything runs client-side — no sign-up, no backend, your data never leaves the
browser.

## Live Access: [qr.synivo.com.au](https://qr.synivo.com.au)

## Development/Contribution - Getting Started

> ⚠️ **Before changing how v-cards or links are encoded**, read [`CLAUDE.md`](./CLAUDE.md).
> QR codes get printed onto physical cards, so the URL/field format is a frozen
> contract — breaking it breaks cards already in customers' hands. The
> golden-fixture tests guard it; a failing one means _don't edit the fixture_.
> For the domain/hosting/route side of keeping printed cards alive, see
> [`RUNBOOK.md`](./RUNBOOK.md).

### Prerequisites

- Node.js (v20 or newer recommended)
- npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/qri-card.git
   cd qri-card
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

#### In web

```bash
npm start
```

#### As Desktop App

```bash
npm run electron:dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Contributing

Two long-lived branches. **`staging` is where work is proven, `main` is what the public
sees.** Nothing reaches `main` except a merge from `staging`.

```
feature branch  ──PR──▶  staging  ──▶ staging.qri-card.pages.dev  (check it here)
                                │
                                └──PR──▶  main  ──▶ qr.synivo.com.au  (public)
```

### 1. Branch off `staging`

```bash
git fetch origin
git switch -c feature/short-description origin/staging
```

Keep a branch to one change. Before you push, run `npm test` and `npm run build` — the
`synivo-ci / ci` check runs both on your PR and a failure blocks the merge.

### 2. PR into `staging`

Open the pull request against **`staging`**, never `main`. It needs the `synivo-ci` checks
green and **one approval**; `staging` takes no direct pushes. Once it merges,
[`deploy-staging.yml`](.gitea/workflows/deploy-staging.yml) builds and publishes it to:

**https://staging.qri-card.pages.dev**

That is a *preview* deployment of the same Cloudflare Pages project — same build, same
upload path as production. `qr.synivo.com.au` is bound to the production branch and is
untouched. The URL is stable; each deploy replaces what is there.

Staging is served with `X-Robots-Tag: noindex, nofollow` and a `Disallow: /` robots.txt,
written over the build output by the workflow. They are **not** committed:
[`public/robots.txt`](public/robots.txt) ships to production, where it deliberately allows
indexing and points at the sitemap.

**Scan a real card from staging before promoting anything that touches the printed-card
contract.** A rendering that looks right in the builder can still encode a URL that no
longer resolves — that is the failure this branch exists to catch, and it is invisible in
unit tests.

### 3. PR `staging` → `main` to release

When staging looks right, open a PR from **`staging` into `main`**. It needs the same
checks plus **one approval**, and `main` takes no direct pushes. The
`synivo-ci / enforce-source` check fails the PR if it comes from any branch other than
`staging` — Gitea 1.22 has no native "restrict source branch" rule, so that check is the
rule. It also fails if any printed-card guardrail file has been deleted.

Merging publishes `qr.synivo.com.au` (tests run again first — see
[`deploy-pages.yml`](.gitea/workflows/deploy-pages.yml)).

> **Repo admins can merge straight past all of this.** Gitea exempts admins from both the
> required checks and the approval count, so for an owner these rules are a speed bump,
> not a lock. For everyone with plain write access they are hard.

### Rules of thumb

- **Never commit straight to `staging` or `main`.** Both get their content through PRs.
- **Never open a PR into `main` from a feature branch** — it fails `enforce-source`.
- **Keep `staging` mergeable into `main`.** If they diverge, `main` is the truth; sync with
  a PR from `main` into `staging`.
- Delete your feature branch after it merges.

Neither `main` nor `staging` can be deleted: in Gitea a protected branch cannot be removed
by anyone, including a site admin — that covers `git push --delete`, the UI, the REST API,
and the *delete branch after merge* tick on a `staging` → `main` PR.

---

### Build the Docker image

```bash
docker build -t qri-card .
```

### Run the Docker container

```bash
docker run -p 3000:80 qri-card
```

---

### Build Desktop release

```bash
npm run electron:dist
```

## Project Structure

```
src/
  App.tsx                     # Routes + top nav (Single / Bulk switch)
  components/
    QRGenerator.tsx           # single-code builder (/)
    BatchGenerator.tsx        # bulk CSV → ZIP / label-sheet PDF (/batch)
    VCardView.tsx             # hosted contact page a scan opens (/vcard-view)
    LinkRedirect.tsx          # /link?url= redirector
    PageInfoSections.tsx      # shared Help / About / Disclaimer
  utils/
    vcard.ts, vCardFields.tsx, vcardTemplates.ts   # ⚠️ printed-card contract
    qrOptions.ts, scannability.ts                  # design → QR options, contrast guard
    csv.ts, zip.ts, pdf.ts, eps.ts                 # batch parsing + export writers
    designUrl.ts, recents.ts                       # share links + recent history
  *.test.* alongside each module                   # unit + golden-fixture tests
```

> ⚠️ `vcard.ts`, `vCardFields.tsx` and `vcardTemplates.ts` are the frozen
> printed-card encoding contract — see [`CLAUDE.md`](./CLAUDE.md) before editing.

## Technologies Used

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) — styled QR (gradients, logo, dot/eye shapes)
- [react-qr-code](https://github.com/rosskhanas/react-qr-code) — lightweight batch-preview QRs
- [html-to-image](https://github.com/bubkoo/html-to-image) — export the styled preview
- [lz-string](https://github.com/pieroxy/lz-string) — compress v-card data into share links
- ZIP / PDF / EPS exports are dependency-free writers in `src/utils/` (see [`CLAUDE.md`](./CLAUDE.md))
- Deployed to [Cloudflare Pages](https://pages.cloudflare.com/)
