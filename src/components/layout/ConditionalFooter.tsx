"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Non mostrare il footer nelle pagine dashboard e login
  const isDashboard = pathname?.startsWith("/dashboard");
  const isLogin = pathname?.startsWith("/login");
  
  if (isDashboard || isLogin) {
    return null;
  }
  
  return <Footer />;
}
