import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email Builder",
  description: "AI powered email template builder with live preview",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
