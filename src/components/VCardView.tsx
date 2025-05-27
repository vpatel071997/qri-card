import { useEffect, useState } from "react";
import { Container, Card, Button, Row, Col } from "react-bootstrap";

import { VCardProps } from "../utils/props";
import { vCardFields } from "../utils/vCardFields";

export default function VCardView() {
    const [vCard, setVCard] = useState<VCardProps | null>();

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const vCardData: VCardProps = {};
        const seen = new Set<string>();

        // Remove duplicates from incoming URL params
        searchParams.forEach((value, key) => {
            if (!seen.has(key)) {
                vCardData[key] = value;
                seen.add(key);
            }
        });

        setVCard(vCardData);
    }, []);


    const handleAddToContacts = () => {
        if (!vCard) return;

        let vcardStr = "BEGIN:VCARD\nVERSION:3.0\n";

        // Name fields (special handling for N and FN)
        vcardStr += `N:${vCard.lastName || ""};${vCard.firstName || ""};${vCard.middleName || ""};${vCard.prefix || ""};${vCard.suffix || ""}\n`;
        vcardStr += `FN:${[vCard.prefix, vCard.firstName, vCard.middleName, vCard.lastName, vCard.suffix].filter(Boolean).join(" ")}\n`;

        // Map fields to vCard lines
        vCardFields.forEach(field => {
            const value = vCard[field.name];
            if (!value) return;

            switch (field.name) {
                case "nickname":
                    vcardStr += `NICKNAME:${value}\n`;
                    break;
                case "email":
                    vcardStr += `EMAIL:${value}\n`;
                    break;
                case "phone":
                    vcardStr += `TEL;TYPE=MAIN:${value}\n`;
                    break;
                case "homePhone":
                    vcardStr += `TEL;TYPE=HOME:${value}\n`;
                    break;
                case "workPhone":
                    vcardStr += `TEL;TYPE=WORK:${value}\n`;
                    break;
                case "cellPhone":
                    vcardStr += `TEL;TYPE=CELL:${value}\n`;
                    break;
                case "fax":
                    vcardStr += `TEL;TYPE=FAX:${value}\n`;
                    break;
                case "org":
                    vcardStr += `ORG:${value}\n`;
                    break;
                case "title":
                    vcardStr += `TITLE:${value}\n`;
                    break;
                case "street":
                case "city":
                case "state":
                case "country":
                case "postalCode":
                    // Address handled below
                    break;
                case "website":
                    vcardStr += `URL:${value}\n`;
                    break;
                case "birthday":
                    vcardStr += `BDAY:${value}\n`;
                    break;
                case "photoUrl":
                    vcardStr += `PHOTO;VALUE=URI:${value}\n`;
                    break;
                case "gender":
                    vcardStr += `GENDER:${value}\n`;
                    break;
                case "timezone":
                    vcardStr += `TZ:${value}\n`;
                    break;
                case "note":
                    vcardStr += `NOTE:${value}\n`;
                    break;
                default:
                    break;
            }
        });

        // Address (combine fields)
        if (
            vCard.street ||
            vCard.city ||
            vCard.state ||
            vCard.country ||
            vCard.postalCode
        ) {
            vcardStr += `ADR;TYPE=HOME:;;${vCard.street || ""};${vCard.city || ""};${vCard.state || ""};${vCard.postalCode || ""};${vCard.country || ""}\n`;
        }

        vcardStr += "END:VCARD";

        // Download as .vcf
        const blob = new Blob([vcardStr], { type: "text/vcard" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${vCard.firstName || "contact"}.vcf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
                                <Row>
                                    <Col xs={12}>
                                        <ul className="list-group">
                                            {vCardFields.map((field) => (
                                                vCard?.[field.name] ? (
                                                    <li className="list-group-item" key={field.name}>
                                                        <strong>{field.label}:</strong> {vCard[field.name]}
                                                    </li>
                                                ) : null
                                            ))}
                                        </ul>
                                    </Col>
                                </Row>
                                <Button variant="primary" onClick={handleAddToContacts}>
                                    Add to Contacts
                                </Button>
                            </Card.Body>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container >
    );
}
