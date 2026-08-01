import { useEffect, useState } from "react";
import { BoxArrowUpRight } from "react-bootstrap-icons";

export default function LinkRedirect() {
  const [target, setTarget] = useState<string>("");
  const [invalid, setInvalid] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("url") || "";

    if (!raw) {
      setInvalid(true);
      return;
    }

    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    // Only allow http(s) targets to avoid javascript: and other schemes.
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setInvalid(true);
        return;
      }
      setTarget(normalized);
      window.location.replace(normalized);
    } catch {
      setInvalid(true);
    }
  }, []);

  return (
    <div className="redirect-view">
      <div className="redirect-card">
        <span className="redirect-icon">
          <BoxArrowUpRight size={26} aria-hidden />
        </span>
        {invalid ? (
          <>
            <h1>Invalid link</h1>
            <p>This link doesn’t point anywhere valid.</p>
          </>
        ) : (
          <>
            <h1>Redirecting…</h1>
            <p>
              Taking you to your destination. If nothing happens,{" "}
              <a href={target} rel="noopener noreferrer">
                tap here
              </a>
              .
            </p>
          </>
        )}
      </div>

      <p className="redirect-brand">
        Powered by{" "}
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
