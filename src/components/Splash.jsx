import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOGO_URL = "https://media.base44.com/images/public/69df26522754d022dfa80e75/8895c0774_Blanchin-logo-animation-breve-trasparente.gif";

export default function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <img
            src={LOGO_URL}
            alt="Blanchin"
            className="w-[80vw] h-[80vw] sm:w-[60vw] sm:h-[60vw] max-w-[672px] max-h-[672px] object-contain"
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}