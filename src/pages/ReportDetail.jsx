import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft, MapPin, Truck, Users, Zap, Wrench, Package, Calendar, User, Trash2, Pencil,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import DetailSection, { DetailRow } from "@/components/detail/DetailSection";
import { fmtOre } from "@/lib/timbratureUtils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ReportDetail() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = window.location.pathname.split("/report/")[1];
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => setCurrentUser(u));
    base44.entities.User.list().then(setUsersList).catch(() => {});
  }, []);

  // Lista di tutti i rapportini visibili (più recenti in alto) per navigazione swipe
  useEffect(() => {
    base44.entities.Rapportino.list("-data", 500).then((list) => {
      const sorted = [...list].sort((a, b) => new Date(b.data) - new Date(a.data));
      setAllReports(sorted);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    base44.entities.Rapportino.filter({ id }).then((results) => {
      setReport(results[0] || null);
      setLoading(false);
    });
  }, [id]);

  const currentIndex = allReports.findIndex((r) => r.id === id);
  const goPrev = () => {
    if (currentIndex > 0) navigate(`/report/${allReports[currentIndex - 1].id}`);
  };
  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < allReports.length - 1) navigate(`/report/${allReports[currentIndex + 1].id}`);
  };

  const onTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };
  const onTouchEnd = (e) => {
    if (touchStart == null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    setTouchStart(null);
    // Ignora swipe troppo piccoli (scroll verticale)
    if (Math.abs(dx) < 60) return;
    if (dx > 0) goPrev();
    else goNext();
  };

  const isAdmin = currentUser?.role === "admin";
  const canEdit = report && currentUser &&
    (isAdmin || (report.user_email === currentUser.email && isToday(new Date(report.data))));

  const handleDelete = async () => {
    await base44.entities.Rapportino.delete(id);
    toast.success("Rapportino eliminato");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Rapportino non trovato</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">Torna alla lista</Button>
      </div>
    );
  }

  const d = report;
  const sommaOreNormali = (d.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
  const compilatoreNome = usersList.find((u) => u.email === d.user_email)?.full_name || d.user_email;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold">{d.cantiere_nome || "Rapportino"}</h1>
                <p className="text-xs text-muted-foreground">
                  {d.data ? format(new Date(d.data), "d MMMM yyyy, HH:mm", { locale: it }) : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentIndex > 0 && (
                <Button variant="ghost" size="icon" onClick={goPrev}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              {currentIndex >= 0 && currentIndex < allReports.length - 1 && (
                <Button variant="ghost" size="icon" onClick={goNext}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              )}
              <Badge variant={d.stato === "inviato" ? "default" : "secondary"} className="text-xs uppercase">
                {d.stato === "inviato" ? "Inviato" : "Bozza"}
              </Badge>
              {canEdit && d.stato === "bozza" && (
                <Button size="sm" onClick={() => navigate(`/modifica-report/${id}`)} className="gap-1.5">
                  <Pencil className="w-4 h-4" /> Compila
                </Button>
              )}
              {canEdit && d.stato !== "bozza" && (
                <Button variant="ghost" size="icon" onClick={() => navigate(`/modifica-report/${id}`)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Elimina rapportino?</AlertDialogTitle>
                    <AlertDialogDescription>Questa azione è irreversibile.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      <div
        className="max-w-2xl mx-auto px-4 py-6"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <DetailSection icon={MapPin} title="Cantiere">
            <DetailRow label="Cantiere" value={d.cantiere_nome} />
            <DetailRow label="Compilatore" value={compilatoreNome} />
            {d.note_generali && <DetailRow label="Note" value={d.note_generali} />}
            {(d.foto || []).length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {d.foto.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </DetailSection>

          {(d.ore_utilizzo_piattaforma > 0 || d.ore_noleggio_mezzi > 0 || d.ore_noleggio_plexi > 0) && (
            <DetailSection icon={Truck} title="Mezzi / Noleggi">
              <DetailRow label="Piattaforma aerea" value={d.ore_utilizzo_piattaforma ? `${d.ore_utilizzo_piattaforma}h` : null} />
              <DetailRow label="Noleggio mezzi" value={d.ore_noleggio_mezzi ? `${d.descrizione_noleggio_mezzi || ""} — ${d.ore_noleggio_mezzi}h` : null} />
              <DetailRow label="Noleggio plexi" value={d.ore_noleggio_plexi ? `${d.descrizione_noleggio_plexi || ""} — ${d.ore_noleggio_plexi}h` : null} />
            </DetailSection>
          )}

          <DetailSection icon={Users} title={`Collaboratori (${(d.collaboratori || []).length})`}>
            <DetailRow label="Ore lavorazione" value={fmtOre(d.ore_totali_squadra || 0)} />
            <DetailRow label="Ore spostamento (auto)" value={fmtOre(d.ore_spostamento || 0)} />
            <DetailRow label="Totale ore cantiere" value={fmtOre((d.ore_totali_squadra || 0) + (d.ore_spostamento || 0))} />
            {(d.collaboratori || []).map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-sm">
                <span>{c.nome}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{c.ore_lavorate}h</Badge>
                  {c.note_imprevisti && <span className="text-xs text-muted-foreground italic">{c.note_imprevisti}</span>}
                </div>
              </div>
            ))}
          </DetailSection>

          {d.has_lavorazioni_extra && (d.lavorazioni_extra || []).length > 0 && (
            <DetailSection icon={Zap} title="Lavorazioni Extra">
              {d.lavorazioni_extra.map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span>{l.descrizione || "—"}</span>
                  <Badge variant="secondary" className="text-xs">{l.ore}h</Badge>
                </div>
              ))}
            </DetailSection>
          )}

          <DetailSection icon={Wrench} title={`Lavorazioni Normali (${sommaOreNormali.toFixed(1)}h)`}>
            {(d.lavorazioni_normali || []).map((l, i) => (
              <div key={i} className="py-1 text-sm">
                <div className="flex justify-between">
                  <span>{l.tipo_lavorazione_nome || l.descrizione_custom || "—"}</span>
                  <Badge variant="secondary" className="text-xs">{l.ore_totali}h</Badge>
                </div>
                {l.descrizione && (
                  <p className="text-xs text-muted-foreground mt-0.5">{l.descrizione}</p>
                )}
              </div>
            ))}
          </DetailSection>

          {(d.materiali || []).length > 0 && (
            <DetailSection icon={Package} title={`Materiali (${d.materiali.length})`}>
              {d.materiali.map((m, i) => (
                <div key={i} className="py-1 text-sm">
                  <div className="flex justify-between">
                    <span>{m.nome || m.descrizione_custom || "—"}</span>
                    <span className="font-medium">{m.quantita} {m.unita_misura}</span>
                  </div>
                  {m.descrizione && (
                    <p className="text-xs text-muted-foreground mt-0.5">{m.descrizione}</p>
                  )}
                </div>
              ))}
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}