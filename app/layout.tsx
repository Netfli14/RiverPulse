import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiverPulse — мониторинг состояния воды",
  description: "Интерактивная платформа экологического мониторинга рек, предупреждений и работы RiverCleaner.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
