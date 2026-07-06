import fs from "fs";
import path from "path";

/**
 * ⚠️  ROUTE EXISTENCE — printed cards depend on these paths resolving.
 *
 * A QR built from a shared link points at /vcard-view or /link. If either route
 * is renamed/removed, or the SPA fallback in public/_redirects is dropped,
 * every such printed card 404s. These tests guard the routing surface; the
 * encoding format itself is guarded by utils/vcard.test.tsx, and the components
 * are rendered in VCardView.test.tsx / LinkRedirect.test.tsx.
 *
 * (Asserted against source rather than by rendering <App/>, because react-router
 * v7's package exports don't resolve under CRA's Jest resolver.)
 */
const read = (p: string) =>
  fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("routes that printed QR codes rely on", () => {
  const app = read("src/App.tsx");

  it("wires /vcard-view to the contact viewer", () => {
    expect(app).toMatch(/path="\/vcard-view"\s+element=\{<VCardView/);
  });

  it("wires /link to the redirect page", () => {
    expect(app).toMatch(/path="\/link"\s+element=\{<LinkRedirect/);
  });

  it("wires / to the QR generator", () => {
    expect(app).toMatch(/path="\/"\s+element=\{<QRGenerator/);
  });

  it("keeps the SPA fallback so deep links resolve on Cloudflare Pages", () => {
    // Without this catch-all, /vcard-view and /link 404 on a fresh page load.
    expect(read("public/_redirects")).toMatch(/\/\*\s+\/index\.html\s+200/);
  });
});
