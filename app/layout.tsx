import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryBuildr",
  description: "Audit your gym's content, mine your stories, and get a 30-day content plan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
