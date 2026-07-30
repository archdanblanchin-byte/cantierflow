import { Link, useLocation } from "react-router-dom";
import { Home, ClipboardList, Building2, BookUser, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermessi } from "@/hooks/usePermessi";

const ALL_NAV_ITEMS = [
  { key: "home", label: "Home", icon: Home, path: "/", always: true },
  { key: "timbratura", label: "Timbra", icon: Clock, path: "/timbratura" },
  { key: "rapportini", label: "Rapportini", icon: ClipboardList, path: "/rapportini" },
  { key: "cantieri", label: "Cantieri", icon: Building2, path: "/cantieri" },
  { key: "anagrafe", label: "Anagrafe", icon: BookUser, path: "/anagrafe" },
];

export default function BottomNav() {
  const location = useLocation();
  const { puoVedere } = usePermessi();
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(i => i.always || puoVedere(i.key));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}