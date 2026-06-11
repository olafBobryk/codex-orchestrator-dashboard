import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Codex Orchestrator Static Example",
  description:
    "A public static example of the Codex Orchestrator Dashboard shape-strategy graph.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
