import * as XLSX from "xlsx";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { arrotondaOre } from "@/lib/timbratureUtils";
import { fmtOreBreve, fmtOrePermesso } from "@/lib/riepilogoMensile";

const nomeMese = (mese) => {
  const m = format(mese, "MMMM yyyy", { locale: it });
  return m.charAt(0).toUpperCase() + m.slice(1);
};

function salva(wb, nomeFile) {
  XLSX.writeFile(wb, `${nomeFile}.xlsx`);
}

function creaFoglio(aoa, larghezze, nomeSheet) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = larghezze.map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nomeSheet.slice(0, 31));
  return wb;
}

const valoreOre = (ore) => (ore > 0 ? ore : "");

/** Scarica il foglio riepilogativo mensile (tutti i dipendenti × tutti i giorni). */
export function esportaRiepilogoMensile({ giorni, righe }, mese) {
  const aoa = [
    [
      "Dipendente",
      ...giorni.map((d) => format(d, "d")),
      "Tot ore",
      "Straordinari",
      "Spostamenti",
      "Trasferte (gg)",
      "Km trasferta",
      "Permessi (h)",
      "Ferie (gg)",
    ],
  ];

  righe.forEach((r) => {
    aoa.push([
      r.collaboratore.nome,
      ...giorni.map((d) => {
        const c = r.celle[format(d, "yyyy-MM-dd")];
        if (!c) return "";
        const sigla = c.permesso ? (c.permesso === "ferie" ? "F" : "P") : "";
        const perm = sigla ? `${sigla}${c.permessoOre ? ` ${fmtOrePermesso(c.permessoOre)}` : ""}` : "";
        // Marca le giornate: +extra (verde) o -deficit (rosso) come testo
        let marca = "";
        if (c.straordinario > 0) marca = ` +${fmtOreBreve(c.straordinario)}`;
        else if (c.deficit > 0) marca = ` -${fmtOreBreve(c.deficit)}`;
        if ((c.ore || 0) > 0) {
          const base = perm ? `${fmtOreBreve(c.ore)} + ${perm}` : c.ore;
          return `${base}${marca}`;
        }
        return perm;
      }),
      r.totOre || 0,
      r.totStraordinari || 0,
      r.totSpost || 0,
      r.nTrasferte || 0,
      r.totKm || 0,
      r.totPermessoOre || 0,
      r.giorniFerie || 0,
    ]);
  });

  aoa.push([
    "Totale giorno",
    ...giorni.map((d) => {
      const k = format(d, "yyyy-MM-dd");
      return valoreOre(righe.reduce((s, r) => s + (r.celle[k]?.ore || 0), 0));
    }),
    arrotondaOre(righe.reduce((s, r) => s + r.totOre, 0)),
    arrotondaOre(righe.reduce((s, r) => s + (r.totStraordinari || 0), 0)),
    "",
    "",
    "",
    arrotondaOre(righe.reduce((s, r) => s + (r.totPermessoOre || 0), 0)),
    "",
  ]);

  const wb = creaFoglio(
    aoa,
    [24, ...giorni.map(() => 10), 9, 11, 12, 13, 13, 12, 10],
    "Riepilogo"
  );
  salva(wb, `Riepilogo ore ${nomeMese(mese)}`);
}

/** Scarica il riepilogo di un singolo cantiere (persone × giorni, con totale per persona). */
export function esportaRiepilogoCantiere({ cantiereNome, giorni, righe, totale }, mese) {
  const aoa = [
    [cantiereNome],
    [`Ore lavorate per cantiere · ${nomeMese(mese)}`],
    [],
    ["Dipendente", ...giorni.map((d) => format(d, "d")), "Tot ore", "Giorni"],
  ];

  righe.forEach((r) => {
    aoa.push([
      r.collaboratore.nome,
      ...giorni.map((d) => valoreOre(r.celle[format(d, "yyyy-MM-dd")]?.ore || 0)),
      r.totOre || 0,
      r.giorniLavorati || 0,
    ]);
  });

  aoa.push([
    "Totale giorno",
    ...giorni.map((d) => {
      const k = format(d, "yyyy-MM-dd");
      return valoreOre(righe.reduce((s, r) => s + (r.celle[k]?.ore || 0), 0));
    }),
    totale || 0,
    "",
  ]);

  const wb = creaFoglio(aoa, [24, ...giorni.map(() => 5), 9, 8], cantiereNome);
  salva(wb, `${cantiereNome} - ore ${nomeMese(mese)}`);
}