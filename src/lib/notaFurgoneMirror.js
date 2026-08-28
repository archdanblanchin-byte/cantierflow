import { base44 } from "@/api/base44Client";

const PROBLEM_RE = /problema|guasto|anomalia|spia|rotto|danneggiat|freni|motore|gomma|gomme|batteria|non parte|strano|fumo|perdit|olio|surriscal|malfunzion|rumore/;
const WARNING_RE = /scadenz|scad|rinnova|revision|assicuraz|tagliando|chilometr|km /;

/**
 * Se una nota di comunicazione (condivisa con destinatari) è collegata a un
 * furgone, la riflette nel registro del furgone come NotaFurgone, rilevando
 * automaticamente se è un problema, un avviso (scadenze) o una nota neutra.
 * Best-effort: gli errori vengono ignorati.
 */
export async function maybeMirrorNotaToFurgone(nota) {
  try {
    if (!nota || !nota.furgone_id) return;
    if (nota.privata) return; // solo comunicazioni condivise (non note personali)
    const testo = nota.testo || "";
    const low = testo.toLowerCase();
    let tipo = "nota";
    if (PROBLEM_RE.test(low)) tipo = "problema";
    else if (WARNING_RE.test(low)) tipo = "avviso";
    await base44.entities.NotaFurgone.create({
      furgone_id: nota.furgone_id,
      furgone_nome: nota.furgone_nome || null,
      testo,
      tipo,
      autore_nome: nota.created_by || "Nota condivisa",
      autore_email: nota.created_by || "",
    });
  } catch {
    /* best-effort */
  }
}