import type { Metadata } from "next";
// Fontes locais, sem rede. Famílias e papéis em shared/config/font.ts.
import "@fontsource-variable/familjen-grotesk/wght.css";
import "@fontsource-variable/brygada-1918/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import { themeVars } from "@/shared/config/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexo",
  description: "Nova aba local para atalhos, contextos e prioridades.",
  // Caminhos relativos: a página é index.html na raiz da extensão.
  icons: {
    icon: [
      { url: "brand/favicon.svg", type: "image/svg+xml" },
      { url: "brand/favicon.ico", sizes: "48x48" },
    ],
  },
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
