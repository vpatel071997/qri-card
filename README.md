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

## Live Access: [Click Me](https://qri-card.vercel.app)

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
