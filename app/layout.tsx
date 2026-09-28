import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operations Toolkit AI",
  description: "Turn business problems into structured solutions with practical operations frameworks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
