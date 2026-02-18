import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-5SK95Q26" />
      <body>{children}</body>
    </html>
  );
}
