"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Non mostrare il footer nelle pagine dashboard, login e homepage (ha il proprio footer nel container)
  const isDashboard = pathname?.startsWith("/dashboard");
  const isLogin = pathname?.startsWith("/login");
  const isHome = pathname === "/";
  
  if (isDashboard || isLogin || isHome) {
    return null;
  }
  
  return <Footer />;
}
