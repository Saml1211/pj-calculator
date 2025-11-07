import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projector Calculator",
  description: "A web application for live event technicians and installation designers to plan multi-projector setups.",
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
