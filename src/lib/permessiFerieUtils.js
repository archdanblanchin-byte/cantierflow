/**
 * Raggruppa i permessi e le ferie salvati nel database per giorno, nella forma
 * attesa dal riepilogo mensile e dai calendari individuali:
 * { "yyyy-MM-dd": [{ nome, tipo, ore }] }
 */
export function raggruppaPermessiPerGiorno(records = []) {
  const map = {};
  records.forEach((r) => {
    if (!r.data) return;
    if (r.tipo !== "permesso" && r.tipo !== "ferie") return;
    (map[r.data] = map[r.data] || []).push({
      nome: r.nome,
      tipo: r.tipo,
      ore: r.ore ?? null,
    });
  });
  return map;
}