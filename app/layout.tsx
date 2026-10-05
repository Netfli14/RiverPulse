import type { Metadata } from "next";
import "./globals.css";
import { RobotProvider } from "@/components/robot-provider";

export const metadata: Metadata = {
  title: "RiverPulse - мониторинг состояния воды",
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
      <body className="antialiased"><RobotProvider>{children}</RobotProvider></body>
    </html>
  );
}
