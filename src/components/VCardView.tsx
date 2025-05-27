import { useEffect, useState } from "react";
import { Container, Button } from "react-bootstrap";

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
            className="d-flex flex-column  p-5"
        >
            <h1 className="mb-4 display-6">Create your VCard</h1>
            <p className="text-muted">Generate a QR Code for any URL. Simply enter the URL below and click 'Generate QR Code'.</p>

            <div className="content">
                <Button variant="primary" onClick={handleAddToContacts}>
                    Add to Contacts
                </Button>

                <table className="table mt-4 bg-transparent text-dark" style={{ background: "transparent" }}>
                    <tbody>
                        {vCardFields.map((field) =>
                            vCard?.[field.name] ? (
                                <tr key={field.name}>
                                    <th className="text-muted" style={{ width: "30%", background: "transparent" }}>{field.label}</th>
                                    <td style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem", background: "transparent" }}>{vCard[field.name]}</td>
                                </tr>
                            ) : null
                        )}
                    </tbody>
                </table>
            </div>
        </Container >
    );
}
