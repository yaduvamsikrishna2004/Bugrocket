import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugRocket", // <--- Changed from "Create Next App"
  description: "AI Code Assistant & Debugger",
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