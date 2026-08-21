import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import Timbratura from "@/pages/Timbratura";
import Cantieri from "@/pages/Cantieri";
import Anagrafe from "@/pages/Anagrafe";

// Percorsi gestiti come "tab" dalla BottomNav: rimangono montati
// (nascosti via CSS) quando si passa da uno all'altro, preservando
// stato e albero dei componenti.
const TABS = [
  { path: "/", Comp: Home, props: {} },
  { path: "/timbratura", Comp: Timbratura, props: {} },
  { path: "/rapportini", Comp: Home, props: { showRapportini: true } },
  { path: "/cantieri", Comp: Cantieri, props: {} },
  { path: "/anagrafe", Comp: Anagrafe, props: {} },
];

export const TAB_PATHS = TABS.map((t) => t.path);

export default function TabLayout() {
  const location = useLocation();
  const path = location.pathname;
  const [visited, setVisited] = useState(
    () => new Set(TAB_PATHS.includes(path) ? [path] : [])
  );

  useEffect(() => {
    if (!TAB_PATHS.includes(path)) return;
    setVisited((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, [path]);

  return (
    <>
      {TABS.map(({ path: tabPath, Comp, props }) => {
        if (!visited.has(tabPath)) return null;
        const active = tabPath === path;
        return (
          <div
            key={tabPath}
            className={active ? "" : "hidden"}
            aria-hidden={!active}
          >
            <Comp {...props} />
          </div>
        );
      })}
    </>
  );
}