import { useEffect, useState } from "react";
import {
  PersonPlus,
  EnvelopeFill,
  TelephoneFill,
  Globe,
  BuildingFill,
  Calendar3,
  GenderAmbiguous,
  GeoAltFill,
  Instagram,
  Linkedin,
  TwitterX,
  Facebook,
  JournalText,
} from "react-bootstrap-icons";
import LZString from "lz-string";

import { VCardProps } from "../utils/props";
import { vCardFields } from "../utils/vCardFields";

type DetailItem = {
  key: string;
  Icon: typeof EnvelopeFill;
  label: string;
  value: string;
  href?: string;
};

export default function VCardView() {
  const [vCard, setVCard] = useState<VCardProps | null>();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let vCardData: VCardProps = {};

    if (searchParams.has("data")) {
      try {
        const compressed = searchParams.get("data") || "";
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (json) {
          vCardData = JSON.parse(json);
          const mappedData: VCardProps = {};
          vCardFields.forEach((field) => {
            if (vCardData[field.id]) {
              mappedData[field.name] = vCardData[field.id];
            }
          });
          vCardData = mappedData;
        }
      } catch (e) {
        console.error("Failed to decompress vCard data", e);
      }
    } else {
      const seen = new Set<string>();
      searchParams.forEach((value, key) => {
        if (!seen.has(key)) {
          vCardData[key] = value;
          seen.add(key);
        }
      });
    }

    setVCard(vCardData);
  }, []);

  const handleAddToContacts = () => {
    if (!vCard) return;

    let vcardStr = "BEGIN:VCARD\nVERSION:3.0\n";

    vcardStr += `N:${vCard.lastName || ""};${vCard.firstName || ""};${vCard.middleName || ""};${vCard.prefix || ""};${vCard.suffix || ""}\n`;
    vcardStr += `FN:${[vCard.prefix, vCard.firstName, vCard.middleName, vCard.lastName, vCard.suffix].filter(Boolean).join(" ")}\n`;

    vCardFields.forEach((field) => {
      const value = vCard[field.name];
      if (!value) return;

      switch (field.name) {
        case "email":
          vcardStr += `EMAIL:${value}\n`;
          break;
        case "phone":
          vcardStr += `TEL;TYPE=CELL:${value}\n`;
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
        case "note":
          vcardStr += `NOTE:${value}\n`;
          break;
        case "linkedin":
          vcardStr += `X-SOCIALPROFILE;TYPE=linkedin:${value}\n`;
          break;
        case "twitter":
          vcardStr += `X-SOCIALPROFILE;TYPE=twitter:${value}\n`;
          break;
        case "facebook":
          vcardStr += `X-SOCIALPROFILE;TYPE=facebook:${value}\n`;
          break;
        case "instagram":
          vcardStr += `X-SOCIALPROFILE;TYPE=instagram:${value}\n`;
          break;
        default:
          break;
      }
    });

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

    const blob = new Blob([vcardStr], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vCard.firstName || "contact"}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fullName = [
    vCard?.title,
    vCard?.firstName,
    vCard?.middleName,
    vCard?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = [vCard?.firstName, vCard?.lastName]
    .filter(Boolean)
    .map((n) => n?.[0]?.toUpperCase())
    .join("");

  // Build the ordered detail rows
  const details: DetailItem[] = [];
  if (vCard) {
    const address = [
      vCard.street,
      vCard.city,
      vCard.state,
      vCard.postalCode,
      vCard.country,
    ]
      .filter(Boolean)
      .join(", ");

    if (vCard.email)
      details.push({
        key: "email",
        Icon: EnvelopeFill,
        label: "Email",
        value: vCard.email,
        href: `mailto:${vCard.email}`,
      });
    if (vCard.phone)
      details.push({
        key: "phone",
        Icon: TelephoneFill,
        label: "Phone",
        value: vCard.phone,
        href: `tel:${vCard.phone}`,
      });
    if (vCard.website)
      details.push({
        key: "website",
        Icon: Globe,
        label: "Website",
        value: vCard.website,
        href: vCard.website,
      });
    if (vCard.org)
      details.push({
        key: "org",
        Icon: BuildingFill,
        label: "Organization",
        value: vCard.org,
      });
    if (vCard.birthday)
      details.push({
        key: "birthday",
        Icon: Calendar3,
        label: "Birthday",
        value: vCard.birthday,
      });
    if (vCard.gender)
      details.push({
        key: "gender",
        Icon: GenderAmbiguous,
        label: "Gender",
        value: vCard.gender,
      });
    if (address)
      details.push({
        key: "address",
        Icon: GeoAltFill,
        label: "Address",
        value: address,
      });
    if (vCard.instagram)
      details.push({
        key: "instagram",
        Icon: Instagram,
        label: "Instagram",
        value: vCard.instagram,
        href: vCard.instagram,
      });
    if (vCard.linkedin)
      details.push({
        key: "linkedin",
        Icon: Linkedin,
        label: "LinkedIn",
        value: vCard.linkedin,
        href: vCard.linkedin,
      });
    if (vCard.twitter)
      details.push({
        key: "twitter",
        Icon: TwitterX,
        label: "Twitter",
        value: vCard.twitter,
        href: vCard.twitter,
      });
    if (vCard.facebook)
      details.push({
        key: "facebook",
        Icon: Facebook,
        label: "Facebook",
        value: vCard.facebook,
        href: vCard.facebook,
      });
    if (vCard.note)
      details.push({
        key: "note",
        Icon: JournalText,
        label: "Note",
        value: vCard.note,
      });
  }

  return (
    <div className="vcard-view">
      <div className="vcard-card">
        <div className="vcard-hero">
          {vCard?.photoUrl ? (
            <img
              src={vCard.photoUrl}
              className="vcard-avatar"
              alt={fullName || "Profile"}
              loading="lazy"
            />
          ) : (
            <div className="vcard-avatar vcard-initials" aria-hidden>
              {initials || "?"}
            </div>
          )}

          <h1 className="vcard-name">{fullName || "Contact"}</h1>
          {vCard?.org && <p className="vcard-org">{vCard.org}</p>}

          <button
            type="button"
            className="primary-btn vcard-add"
            onClick={handleAddToContacts}
          >
            <PersonPlus size={18} aria-hidden />
            Add to Contacts
          </button>
        </div>

        <ul className="vcard-details">
          {details.map(({ key, Icon, label, value, href }) => (
            <li className="vcard-row" key={key}>
              <span className="vcard-row-icon">
                <Icon size={17} aria-hidden />
              </span>
              <div className="vcard-row-body">
                <span className="vcard-row-label">{label}</span>
                {href ? (
                  <a
                    className="vcard-row-value"
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                  >
                    {value}
                  </a>
                ) : (
                  <span className="vcard-row-value">{value}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="vcard-brand">
        Created by{" "}
        <a href="https://synivo.tech/" target="_blank" rel="noopener noreferrer">
          Synivo
        </a>
      </p>
    </div>
  );
}
