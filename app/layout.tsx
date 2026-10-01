import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "wair — Your personal wardrobe", description: "Your closet, reimagined as a daily source of inspiration." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
