import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgencyOS — Engineering Operations Control Plane",
  description: "Human-supervised AI workforce, Scrum execution, and project governance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full min-h-screen antialiased flex flex-col bg-canvas-light text-textPrimary-light dark:bg-canvas-dark dark:text-textPrimary-dark">
        {children}
      </body>
    </html>
  );
}
