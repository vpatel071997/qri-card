import { useRef, useState } from "react";
import { Container, Card, Button, Form, Row, Col } from "react-bootstrap";
import GenerateQR from "react-qr-code";
import { toPng } from "html-to-image";

function App() {
  const [url, setUrl] = useState<string>("");
  const [generate, setGenerate] = useState<boolean>(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (qrRef.current === null) return;

    toPng(qrRef?.current)
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = "qri-card-export.png";
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Error generating QR code PNG:", err);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerate(true);
  };

  const handleClear = () => {
    setUrl("");
    setGenerate(false);
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
    }
  };

  return (
    <Container
      fluid
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background:
          "linear-gradient(135deg,rgb(255, 255, 255) 0%,rgb(239, 239, 239) 100%)",
      }}
    >
      <Row>
        <Col
          sm={12}
          md={6}
          lg={4}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Card
            className="shadow p-3 mb-5 bg-white rounded border-0"
            style={{ alignContent: "center", textAlign: "center" }}
          >
            <Card.Body>
              <Card.Title>Generate Qr Code</Card.Title>
              <hr />
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="formUrl">
                    <Form.Control
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Button variant="primary" type="submit" className="me-2">
                    Gerenate
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleClear}
                    className="me-2"
                  >
                    Clear
                  </Button>
                </Form>

                {generate && url && (
                  <div>
                    <hr />
                    <div
                      ref={qrRef}
                      style={{ background: "white", padding: "18px" }}
                    >
                      <GenerateQR
                        size={256}
                        style={{
                          height: "auto",
                          maxWidth: "100%",
                          width: "100%",
                        }}
                        value={url}
                      />
                    </div>
                    <Button onClick={handleDownload}>Download (.png)</Button>
                  </div>
                )}
              </Card.Body>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
