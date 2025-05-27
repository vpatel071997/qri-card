import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';

import URLToQR from './components/URLToQR';
import VCardGen from './components/VCardGen';
import VCardView from './components/VCardView';
import { useEffect, useState } from 'react';

function App() {
  const location = useLocation();
  const [showNavBar, setShowNavBar] = useState<boolean>(true);

  useEffect(() => {
    setShowNavBar(location.pathname !== "/vcard-view");
  }, [location.pathname]);

  return (
    <>
      {showNavBar && (
        <Navbar expand="sm" className="bg-body-tertiary">
          <Container fluid>
            <Navbar.Brand href="#home">QriCard.</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse className="justify-content-end" style={{ gap: '1rem' }}>
              <Nav.Link as={Link} to="/">Url to QR</Nav.Link>
              <Nav.Link as={Link} to="/vcard-gen">VCard Generator</Nav.Link>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}
      <Container fluid>
        <Routes>
          <Route path="/" element={<URLToQR />} />
          <Route path="/vcard-gen" element={<VCardGen />} />
          <Route path="/vcard-view" element={<VCardView />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
