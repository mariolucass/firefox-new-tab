import type { Metadata } from "next";
import "@fontsource-variable/mulish/wght.css";
import "@fontsource/philosopher/latin-400.css";
import "@fontsource/philosopher/latin-400-italic.css";
import "@fontsource/philosopher/latin-700.css";
import { themeVars } from "@/shared/config/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Command Center",
  description: "Nova aba local para atalhos, contextos e prioridades.",
};

interface RootLayout {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayout>) {
  return (
    <html lang="pt-BR" style={themeVars}>
      <body>{children}</body>
    </html>
  );
}
