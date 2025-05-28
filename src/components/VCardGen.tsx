import { useRef, useState } from "react";
import { Container, Button, Form, Row, Col } from "react-bootstrap";
import GenerateQR from "react-qr-code";
import { toPng } from "html-to-image";

import { VCardProps } from "../utils/props";
import { vCardFields } from "../utils/vCardFields";

export default function VCardGen() {
  const [vCard, setVCard] = useState<VCardProps | null>();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (typeof vCard !== "object" || vCard === null) return;
    // Dynamically build query params from vCard object
    const params = new URLSearchParams();
    Object.entries(vCard).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const trimmedURL = window.location.origin;
    const url = `${trimmedURL}/vcard-view?${params.toString()}`;
    setUrl(url);
    console.log(url);
    setGenerate(true);
  };

  const handleClear = () => {
    setVCard({ firstName: "", lastName: "" });
    setUrl("");
    setGenerate(false);
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
    }
  };

  return (
    <Container fluid className="d-flex flex-column  p-5">
      <h1 className="mb-4 display-6">Create your VCard</h1>
      <p className="text-muted">
        Generate a QR Code for any URL. Simply enter the URL below and click
        'Generate QR Code'.
      </p>

      <div className="content">
        <Form onSubmit={handleSubmit}>
          <Row>
            {vCardFields.map((field) => (
              <Col xs={12} md={6} lg={3} key={field.name}>
                <Form.Group className="mb-3" controlId={`vcard-${field.name}`}>
                  <Form.Label>
                    {field.label}
                    {field.required && " *"}
                  </Form.Label>
                  {field.options ? (
                    <Form.Select
                      className="form-select p-2 border-secondary rounded bg-transparent text-dark"
                      value={vCard?.[field.name] ?? ""}
                      onChange={(e) =>
                        setVCard({ ...vCard, [field.name]: e.target.value })
                      }
                      required={field.required}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Form.Select>
                  ) : field.type === "textarea" ? (
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={vCard?.[field.name] ?? ""}
                      className="form-control p-2 border-secondary rounded bg-transparent text-dark"
                      onChange={(e) =>
                        setVCard({ ...vCard, [field.name]: e.target.value })
                      }
                      required={field.required}
                    />
                  ) : (
                    <Form.Control
                      type={field.type}
                      className="form-control p-2 border-secondary rounded bg-transparent text-dark"
                      value={vCard?.[field.name] ?? ""}
                      onChange={(e) =>
                        setVCard({ ...vCard, [field.name]: e.target.value })
                      }
                      required={field.required}
                    />
                  )}
                </Form.Group>
              </Col>
            ))}
          </Row>
          <Button variant="primary" type="submit" className="me-2">
            Gerenate
          </Button>
          <Button variant="danger" onClick={handleClear} className="me-2">
            Clear
          </Button>
        </Form>

        {generate && url && (
          <div>
            <hr />
            <p>Your VCard Qr Code:</p>
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
                  maxWidth: "100%",
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
