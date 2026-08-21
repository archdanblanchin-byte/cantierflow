import { useLocation, Routes } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TAB_PATHS } from "@/components/TabLayout";

// Animazione push/pop nativa per le navigazioni di stack.
// Per i tab (gestiti da TabLayout) la chiave rimane stabile: nessuna
// animazione e nessun unmount, così lo stato dei tab si preserva.
export default function AnimatedRoutes({ children }) {
  const location = useLocation();
  const isTab = TAB_PATHS.includes(location.pathname);
  const navKey = isTab ? "__tabs__" : location.pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={navKey}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen"
      >
        <Routes location={location}>{children}</Routes>
      </motion.div>
    </AnimatePresence>
  );
}