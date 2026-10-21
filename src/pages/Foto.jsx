import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hammer, Palette, Megaphone } from "lucide-react";

// Le tre categorie della sezione Foto: ogni categoria è un flusso a sé,
// con il suo archivio e il suo modo di caricare le immagini.
const CATEGORIE = [
  {
    id: "andamento",
    label: "Andamento cantiere",
    desc: "Le foto dei lavori, con note e annotazioni",
    Icona: Hammer,
    colore: "text-blue-600 bg-blue-500/10",
  },
  {
    id: "colori",
    label: "Codici colore",
    desc: "Etichette e tinte dei prodotti usati",
    Icona: Palette,
    colore: "text-fuchsia-600 bg-fuchsia-500/10",
  },
  {
    id: "marketing",
    label: "Marketing prima/dopo",
    desc: "Il confronto prima e dopo, dalla stessa posizione",
    Icona: Megaphone,
    colore: "text-amber-600 bg-amber-500/10",
  },
];

export default function FotoPage() {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState("andamento");
  const attiva = CATEGORIE.find((c) => c.id === categoria);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-20 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Foto</h1>
              <p className="text-xs text-muted-foreground">Tre archivi separati: andamento, colori, marketing</p>
            </div>
          </div>

          {/* Selettore delle tre categorie */}
          <div className="mt-4 -mx-4 px-4 overflow-x-auto pb-3">
            <div className="flex gap-2 min-w-max">
              {CATEGORIE.map(({ id, label, Icona, colore }) => (
                <button
                  key={id}
                  onClick={() => setCategoria(id)}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                    categoria === id
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center ${categoria === id ? "bg-primary-foreground/20" : colore}`}>
                    <Icona className="w-3.5 h-3.5" />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${attiva.colore}`}>
              <attiva.Icona className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold">{attiva.label}</h2>
              <p className="text-xs text-muted-foreground">{attiva.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}