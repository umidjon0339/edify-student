"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
// 🟢 This import should match wherever you initialized Firebase in your 'lib' folder
import { auth } from "@/lib/firebase"; 

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("🔴 DEBUG 1: User is logged in as:", user.email);
        
        try {
          const tokenResult = await user.getIdTokenResult(true);
          console.log("🔴 DEBUG 2: User claims are:", tokenResult.claims);
          
          if (tokenResult.claims.super_admin) {
            console.log("🔴 DEBUG 3: Admin access granted!");
            setIsAdmin(true);
          } else {
            console.log("🔴 DEBUG 3: User logged in, but NO super_admin claim. Kicking out.");
            router.push("/"); 
          }
        } catch (error) {
          console.error("🔴 DEBUG ERROR:", error);
          router.push("/"); 
        }
      } else {
        console.log("🔴 DEBUG 1: Nobody is logged in right now. Kicking out.");
        router.push("/"); 
      }
      setIsChecking(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-white">
        <div className="animate-pulse">Verifying Admin Credentials...</div>
      </div>
    );
  }

  if (!isAdmin) return null; // Prevent flicker before redirect

  // 🟢 Render the Admin UI!
  return (
    <div className="flex min-h-screen bg-[#0F172A] text-white">
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}