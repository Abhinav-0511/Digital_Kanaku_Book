import { LayoutDashboard, Truck, Wallet, BarChart3, Settings } from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/loads", label: "Loads", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
