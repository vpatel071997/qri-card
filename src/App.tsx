import { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { QrCodeScan } from "react-bootstrap-icons";

import QRGenerator from "./components/QRGenerator";
import VCardView from "./components/VCardView";
import LinkRedirect from "./components/LinkRedirect";

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
          </div>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<QRGenerator />} />
          <Route path="/url-to-qr" element={<QRGenerator />} />
          <Route path="/vcard-gen" element={<QRGenerator />} />
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
