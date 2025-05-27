import { useRef, useState } from "react";
import { Container, Card, Button, Form, Row, Col } from "react-bootstrap";
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

        if (typeof vCard !== "object" || vCard === null) return
        // Dynamically build query params from vCard object
        const params = new URLSearchParams();
        Object.entries(vCard).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });

        const trimmedURL = window.location.origin;
        const url = `${trimmedURL}/vcard-view?${params.toString()}`;
        setUrl(url);
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
        <Container
            fluid
            className="d-flex flex-column align-items-center justify-content-center"
        >
            <Row>
                <Col
                    sm={12}
                    md={6}
                    lg={6}
                >
                    <Card
                        className="shadow p-3 mb-5 bg-white rounded border-0"
                    >
                        <Card.Body>
                            <Card.Title>View VCard</Card.Title>
                            <hr />
                            <Card.Body>
                                <Form onSubmit={handleSubmit}>
                                    <Row>
                                        {vCardFields.map((field) => (
                                            <Col xs={12} md={field.type === "textarea" ? 12 : 6} key={field.name}>
                                                <Form.Group className="mb-3" controlId={`vcard-${field.name}`}>
                                                    <Form.Label>{field.label}{field.required && " *"}</Form.Label>
                                                    {field.type === "textarea" ? (
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={3}
                                                            placeholder={field.label}
                                                            value={vCard?.[field.name] ?? ""}
                                                            onChange={e => setVCard({ ...vCard, [field.name]: e.target.value })}
                                                            required={field.required}
                                                        />
                                                    ) : (
                                                        <Form.Control
                                                            type={field.type}
                                                            placeholder={field.label}
                                                            value={vCard?.[field.name] ?? ""}
                                                            onChange={e => setVCard({ ...vCard, [field.name]: e.target.value })}
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
        </Container >
    );
}
