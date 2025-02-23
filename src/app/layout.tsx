import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/navigation";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "SharpMail",
  description: "SharpMail is a simple email campaign manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <main>
          <Navigation/>
          {children}
        </main>
        <Toaster/>
      </body>
    </html>
  );
}
