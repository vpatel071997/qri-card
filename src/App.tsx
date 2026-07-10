import { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { QrCodeScan, QuestionCircle, Grid3x3Gap } from "react-bootstrap-icons";

import QRGenerator from "./components/QRGenerator";
import VCardView from "./components/VCardView";
import LinkRedirect from "./components/LinkRedirect";
import BatchGenerator from "./components/BatchGenerator";

const CHROMELESS_PATHS = ["/vcard-view", "/link"];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showChrome, setShowChrome] = useState<boolean>(true);

  useEffect(() => {
    setShowChrome(!CHROMELESS_PATHS.includes(location.pathname));
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {showChrome && (
        <header className="site-nav">
          <div className="site-nav-inner">
            <button
              type="button"
              className="brand"
              onClick={() => navigate("/")}
              aria-label="QriCard home"
            >
              <span className="brand-mark">
                <QrCodeScan size={22} aria-hidden />
              </span>
              <span className="brand-name">QriCard</span>
            </button>

            <div className="site-nav-right">
              <nav className="nav-modes" aria-label="Generator mode">
                <button
                  type="button"
                  className={`nav-mode ${location.pathname !== "/batch" ? "is-active" : ""}`}
                  onClick={() => navigate("/")}
                >
                  <QrCodeScan size={15} aria-hidden />
                  <span>Single</span>
                </button>
                <button
                  type="button"
                  className={`nav-mode ${location.pathname === "/batch" ? "is-active" : ""}`}
                  onClick={() => navigate("/batch")}
                >
                  <Grid3x3Gap size={15} aria-hidden />
                  <span>Bulk / Batch</span>
                </button>
              </nav>

              <button
                type="button"
                className="nav-help"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("qricard:open-help"))
                }
              >
                <QuestionCircle size={16} aria-hidden />
                <span>Help</span>
              </button>

              <p className="nav-powered">
                Powered by{" "}
                <a
                  href="https://synivo.tech/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Synivo
                </a>
              </p>
            </div>
          </div>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<QRGenerator />} />
          <Route path="/url-to-qr" element={<QRGenerator />} />
          <Route path="/vcard-gen" element={<QRGenerator />} />
          <Route path="/batch" element={<BatchGenerator />} />
          <Route path="/vcard-view" element={<VCardView />} />
          <Route path="/link" element={<LinkRedirect />} />
        </Routes>
      </main>

      {showChrome && (
        <footer className="site-footer">
          <p>
            Created by{" "}
            <a
              href="https://synivo.tech/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Synivo
            </a>
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;
