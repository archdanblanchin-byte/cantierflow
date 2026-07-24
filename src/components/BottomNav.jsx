import { Link, useLocation } from "react-router-dom";
import { Home, Fingerprint, ClipboardList, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Timbrature", icon: Fingerprint, path: "/timbrature" },
  { label: "Rapportini", icon: ClipboardList, path: "/rapportini" },
  { label: "Cantieri", icon: Building2, path: "/cantieri" },
];

export default function BottomNav() {
  const location = useLocation();

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