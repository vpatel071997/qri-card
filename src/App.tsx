import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Button, Container, Nav, Navbar } from "react-bootstrap";

import Landing from "./components/Landing";
import URLToQR from "./components/URLToQR";
import VCardGen from "./components/VCardGen";
import VCardView from "./components/VCardView";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNavBar, setShowNavBar] = useState<boolean>(true);

  useEffect(() => {
    setShowNavBar(location.pathname !== "/vcard-view");
  }, [location.pathname]);

  return (
    <div>
      {showNavBar && (
        <Navbar
          expand="sm"
          className="bg-body-tertiary border-bottom"
          data-bs-theme="light"
        >
          <Container fluid>
            <Navbar.Brand href="/">QriCard.</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse
              className="justify-content-end text-body"
              style={{ gap: "1rem" }}
            >
              <Nav.Link as={Link} to="url-to-qr">
                Url to QR
              </Nav.Link>
              <Button variant="primary" onClick={() => navigate("/vcard-gen")}>
                VCard Generator
              </Button>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}
      <Container fluid>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/url-to-qr" element={<URLToQR />} />
          <Route path="/vcard-gen" element={<VCardGen />} />
          <Route path="/vcard-view" element={<VCardView />} />
        </Routes>
      </Container>
    </div>
  );
}

export default App;
