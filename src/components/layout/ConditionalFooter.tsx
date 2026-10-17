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
  const isLive = pathname?.startsWith("/live");
  
  if (isDashboard || isLogin || isRegister || isHome || isTornei || isLive) {
    return null;
  }
  
  return (
    // Sfondo grigio ai lati come il contenitore delle pagine pubbliche
    <div className="bg-gray-50">
      <div className="max-w-[1400px] mx-auto">
        <Footer flush />
      </div>
    </div>
  );
}
