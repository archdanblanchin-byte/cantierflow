import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";

export default function Placeholder({ title = "Sezione" }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold">{title}</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Construction className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Sezione in costruzione</p>
        <p className="text-sm text-muted-foreground mt-1">Disponibile prossimamente</p>
      </div>
    </div>
  );
}