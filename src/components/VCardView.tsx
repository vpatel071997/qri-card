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
import { VCardProps } from "../utils/props";
import { vCardFields } from "../utils/vCardFields";
import { decodeVCardData } from "../utils/vcard";
import {
  DEFAULT_TEMPLATE_ID,
  normalizeTemplateId,
} from "../utils/vcardTemplates";

type DetailItem = {
  key: string;
  Icon: typeof EnvelopeFill;
  label: string;
  value: string;
  href?: string;
};

export default function VCardView() {
  const [vCard, setVCard] = useState<VCardProps | null>();
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE_ID);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let vCardData: VCardProps = {};

    // Pre-selected card style baked into the QR link (?t=<template>).
    setTemplate(normalizeTemplateId(searchParams.get("t")));

    if (searchParams.has("data")) {
      // Shared, compressed format — the printed-card contract (utils/vcard.ts).
      vCardData = decodeVCardData(searchParams.get("data") || "");
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

    // Escape a TEXT value per RFC 6350/2426 so free text (a multi-line Note,
    // an address or org with commas/semicolons) can't break the vCard
    // structure. NOT applied to URI values (URL/PHOTO) — escaping a URL's
    // commas would corrupt the link.
    const esc = (v?: string) =>
      (v || "")
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");

    const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

    // The Title dropdown (Mr./Ms./Dr./…) is an honorific *prefix*, so it goes
    // in N's 4th slot and the formatted name — not TITLE, which is a job title.
    lines.push(
      `N:${esc(vCard.lastName)};${esc(vCard.firstName)};${esc(vCard.middleName)};${esc(vCard.title)};`,
    );
    lines.push(
      `FN:${esc(
        [vCard.title, vCard.firstName, vCard.middleName, vCard.lastName]
          .filter(Boolean)
          .join(" "),
      )}`,
    );

    // Social links as grouped `itemN.URL` + `X-ABLabel`: iOS shows a labelled,
    // clickable link and Android imports it as a website. (X-SOCIALPROFILE,
    // used before, is Apple-only and Android drops it entirely.)
    let itemSeq = 0;
    const social = (label: string, value: string) => {
      itemSeq += 1;
      lines.push(`item${itemSeq}.URL:${value}`);
      lines.push(`item${itemSeq}.X-ABLabel:${label}`);
    };

    vCardFields.forEach((field) => {
      const value = vCard[field.name];
      if (!value) return;

      switch (field.name) {
        case "email":
          lines.push(`EMAIL;TYPE=INTERNET:${esc(value)}`);
          break;
        case "phone":
          lines.push(`TEL;TYPE=CELL:${value}`);
          break;
        case "org":
          lines.push(`ORG:${esc(value)}`);
          break;
        case "website":
          lines.push(`URL:${value}`);
          break;
        case "birthday":
          lines.push(`BDAY:${value}`);
          break;
        case "photoUrl":
          lines.push(`PHOTO;VALUE=URI:${value}`);
          break;
        case "note":
          lines.push(`NOTE:${esc(value)}`);
          break;
        case "instagram":
          social("Instagram", value);
          break;
        case "linkedin":
          social("LinkedIn", value);
          break;
        case "twitter":
          social("Twitter", value);
          break;
        case "facebook":
          social("Facebook", value);
          break;
        // title -> folded into N/FN above.
        // gender -> no interoperable vCard 3.0 form (iOS/Android drop GENDER),
        //   so it's intentionally omitted rather than written as a dead line.
        // address parts -> combined into a single ADR below.
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
      lines.push(
        `ADR;TYPE=HOME:;;${esc(vCard.street)};${esc(vCard.city)};${esc(vCard.state)};${esc(vCard.postalCode)};${esc(vCard.country)}`,
      );
    }

    lines.push("END:VCARD");

    // CRLF line endings per the vCard spec.
    const vcardStr = lines.join("\r\n");

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
    <div className={`vcard-view tpl-${template}`}>
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
        <a
          href="https://synivo.tech/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Synivo
        </a>
      </p>
    </div>
  );
}
