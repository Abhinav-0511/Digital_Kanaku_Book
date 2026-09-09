import { LayoutDashboard, Truck, Wallet, Search, Settings } from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/loads", label: "Loads", icon: Truck },
  { href: "/search", label: "Search", icon: Search },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
