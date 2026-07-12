import { useEffect, useState, ReactNode } from "react";
import {
  QuestionCircle,
  ChevronDown,
  InfoCircle,
  ShieldLock,
} from "react-bootstrap-icons";

export interface HelpStep {
  icon: ReactNode;
  title: string;
  body: ReactNode;
}

/**
 * The shared Help / About / Disclaimer footer used on every builder page.
 * Owning the collapsible Help state + the `qricard:open-help` (header button)
 * and `#help` deep-link listeners here means both the single-code and batch
 * pages get an identical, working Help section for free.
 */
export default function PageInfoSections({
  helpSteps,
}: {
  helpSteps: HelpStep[];
}) {
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    const openHelp = () => {
      setHelpOpen(true);
      // Wait for the steps to expand before scrolling so we land on the
      // fully-rendered section.
      window.setTimeout(() => {
        document
          .getElementById("help")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    };
    const openFromHash = () => {
      if (window.location.hash === "#help") openHelp();
    };

    openFromHash();
    window.addEventListener("qricard:open-help", openHelp);
    window.addEventListener("hashchange", openFromHash);
    return () => {
      window.removeEventListener("qricard:open-help", openHelp);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  return (
    <>
      {/* ------------------------------- Help ------------------------------- */}
      <section className="panel help-card" id="help">
        <button
          type="button"
          className="section-head help-toggle"
          aria-expanded={helpOpen}
          aria-controls="help-steps"
          onClick={() => setHelpOpen((o) => !o)}
        >
          <span className="section-icon">
            <QuestionCircle size={20} aria-hidden />
          </span>
          <h2>Help &amp; How it works</h2>
          <ChevronDown
            className={`help-caret ${helpOpen ? "is-open" : ""}`}
            size={20}
            aria-hidden
          />
        </button>

        {helpOpen && (
          <div className="help-steps" id="help-steps">
            {helpSteps.map((step, i) => (
              <div className="help-step" key={i}>
                <span className="help-step-icon">{step.icon}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------- About ------------------------------ */}
      <section className="panel about-card">
        <div className="section-head">
          <span className="section-icon">
            <InfoCircle size={20} aria-hidden />
          </span>
          <h2>About QriCard</h2>
        </div>
        <p>
          QriCard is a free, no-sign-up tool to generate QR codes for links and
          shareable digital business cards. Everything runs right in your
          browser — your data never leaves your device. Customize the frame,
          shape, and color, then download a crisp PNG, SVG, or PDF in a single
          click.
        </p>
      </section>

      {/* --------------------- Disclaimer & Privacy ------------------------ */}
      <section className="panel disclaimer-card" id="disclaimer">
        <div className="section-head">
          <span className="section-icon">
            <ShieldLock size={20} aria-hidden />
          </span>
          <h2>Disclaimer &amp; Privacy</h2>
        </div>

        <div className="disclaimer-block">
          <h3>Terms &amp; limitations</h3>
          <ul>
            <li>
              QriCard is provided <strong>“as is”</strong>, free of charge and
              without any warranty. You are responsible for the accuracy of the
              details you enter and for how you use the QR codes you create.
            </li>
            <li>
              A QR code encodes your data at the moment it is generated. Once a
              code is <strong>printed or shared it cannot be changed</strong> —
              generate a new one if your details change.
            </li>
            <li>
              Saving a contact (the <em>.vcf</em> file) depends on the scanning
              phone. Support varies between iOS and Android, and some fields
              (such as photo-by-URL or certain social links) may not import on
              every device.
            </li>
          </ul>
        </div>

        <div className="disclaimer-block">
          <h3>Privacy policy</h3>
          <ul>
            <li>
              Everything runs in your browser. Your details are{" "}
              <strong>never sent to or stored on our servers</strong>.
            </li>
            <li>
              Your entries are saved only in this browser (local storage) so you
              can pick up where you left off. Use <strong>“Clear all”</strong>{" "}
              to remove them at any time.
            </li>
            <li>
              When you share a v-card or link, the data is encoded directly into
              the QR code / URL.{" "}
              <strong>Anyone who scans it can read it</strong>, so don’t include
              information you wouldn’t want shared publicly.
            </li>
            <li>No accounts, no ads, and no tracking cookies.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
