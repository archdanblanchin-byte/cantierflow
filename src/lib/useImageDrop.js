import { useState, useCallback, useRef } from "react";

/**
 * Hook per il drag-and-drop di immagini.
 * Ritorna { isDragging, handlers } da spargere sull'elemento dropzone.
 * onFiles riceve l'array di File di tipo immagine rilasciati.
 */
export function useImageDrop(onFiles) {
  const [isDragging, setIsDragging] = useState(false);
  const depth = useRef(0);

  const hasFiles = (e) => {
    const types = e.dataTransfer?.types;
    return !!types && Array.from(types).includes("Files");
  };

  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasFiles(e)) return;
    depth.current += 1;
    setIsDragging(true);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setIsDragging(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    depth.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length && typeof onFiles === "function") onFiles(files);
  }, [onFiles]);

  return { isDragging, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}