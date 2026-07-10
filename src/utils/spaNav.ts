import type { MouseEvent } from "react";

// Client-side navigation WITHOUT importing react-router into components.
// react-router v7's package exports don't resolve under CRA's Jest resolver
// (see App.test.tsx), so any component that imports it breaks the test suite.
// Instead a component renders a real <a href> and dispatches this event on a
// plain left-click; App (which does use react-router) listens and calls
// navigate(). This mirrors the existing `qricard:open-help` event pattern and
// keeps SPA navigation (no full reload) without a router import here.
export const SPA_NAVIGATE_EVENT = "qricard:navigate";

export function spaLinkProps(path: string) {
  return {
    href: path,
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      // Let modified / non-left clicks (open-in-new-tab, middle-click) fall
      // through to the browser using the real href.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent(SPA_NAVIGATE_EVENT, { detail: path }),
      );
    },
  };
}
