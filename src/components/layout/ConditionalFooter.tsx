"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Non mostrare il footer nelle pagine dashboard, auth e homepage e tornei (hanno il proprio footer nel container)
  const isDashboard = pathname?.startsWith("/dashboard");
  const isLogin = pathname?.startsWith("/login");
  const isRegister = pathname?.startsWith("/register");
  const isHome = pathname === "/";
  const isTornei = pathname?.startsWith("/tornei");
  
  if (isDashboard || isLogin || isRegister || isHome || isTornei) {
    return null;
  }
  
  return (
    <div className="max-w-[1400px] mx-auto">
      <Footer flush />
    </div>
  );
}
