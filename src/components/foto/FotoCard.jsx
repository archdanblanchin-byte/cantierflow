import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ZoomIn, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FotoCard({ foto, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const displayUrl = foto.url_annotata || foto.url;

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden bg-card group">
        <div className="relative aspect-video cursor-pointer" onClick={() => setOpen(true)}>
          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {foto.annotazioni?.length > 0 && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
              {foto.annotazioni.length} annot.
            </div>
          )}
        </div>
        <div className="p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {foto.cantiere_nome && (
                <p className="text-[11px] font-semibold text-primary truncate">{foto.cantiere_nome}</p>
              )}
              {foto.nota && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 flex gap-1">
                  <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {foto.nota}
                </p>
              )}
              {foto.created_date && (
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {new Date(foto.created_date).toLocaleDateString("it-IT")}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(foto)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(foto)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-2">
          <img src={displayUrl} alt="" className="w-full max-h-[85vh] object-contain rounded-lg" />
          {foto.nota && (
            <div className="flex items-start gap-2 px-2 pb-1">
              <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{foto.nota}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}