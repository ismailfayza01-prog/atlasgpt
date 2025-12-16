import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";

export const metadata = { title: "Atlas Parcel Europe — Supabase MVP" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
