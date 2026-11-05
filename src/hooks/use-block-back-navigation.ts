import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the user on the current route when the browser Back button is pressed.
 *
 * Next's popstate listener cannot be pre-empted: on window, Chrome runs listeners
 * in registration order even with `capture`. So instead of stopping it, Back lands
 * on a sentinel entry for the same route, which makes Next's traversal a no-op, and
 * the entry is then pushed again. Enable this only once the URL is the route to keep.
 *
 * Browsers do not allow this to be absolute: picking another site from the Back
 * menu, or pressing Back on a freshly loaded page with no user interaction, can
 * still leave the document.
 */
export function useBlockBackNavigation(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const guardedUrl = window.location.href;
    const guardedPath = window.location.pathname + window.location.search;
    window.history.pushState(window.history.state, "", guardedUrl);

    const handlePopState = () => {
      if (window.location.href === guardedUrl) {
        window.history.pushState(window.history.state, "", guardedUrl);
      } else {
        // Jumped past the sentinel (Back menu, or Chrome skipping the entry).
        router.push(guardedPath);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [enabled, router]);
}
