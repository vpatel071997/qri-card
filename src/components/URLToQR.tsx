import { useRef, useState } from "react";
import { Container, Button, Form } from "react-bootstrap";
import GenerateQR from "react-qr-code";
import { toPng } from "html-to-image";

function URLToQR() {
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
    <Container fluid className="d-flex flex-column  p-5">
      <h1 className="mb-4 display-6">QR Code Generator</h1>
      <p className="text-muted">
        Generate a QR Code for any URL. Simply enter the URL below and click
        'Generate QR Code'.
      </p>

      <div className="content" style={{ maxWidth: "600px" }}>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formUrl">
            <Form.Control
              type="url"
              placeholder="Enter URL"
              value={url}
              onChange={handleChange}
              className="form-control p-2 border-secondary rounded bg-transparent text-dark"
              required
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="me-2">
            Generate
          </Button>
          <Button variant="danger" onClick={handleClear} className="me-2">
            Clear
          </Button>
        </Form>
        {generate && url && (
          <div>
            <hr />
            <p>Generated Qr Code:</p>
            <div
              ref={qrRef}
              style={{
                background: "white",
                padding: "18px",
                maxWidth: "200px",
                marginBottom: "20px",
              }}
            >
              <GenerateQR
                size={256}
                style={{
                  height: "auto",
                  width: "100%",
                }}
                value={url}
              />
            </div>
            <Button onClick={handleDownload}>Download (.png)</Button>
          </div>
        )}
      </div>
    </Container>
  );
}

export default URLToQR;
