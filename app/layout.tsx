import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pupilcare-app.brilux.chatgpt.site"),
  title: "PupilCare — cała opieka nad pupilem",
  description: "AI, własny weterynarz 24/7, wizyty, przypomnienia i historia pupila w jednym miejscu.",
  openGraph: {
    title: "PupilCare — cała opieka nad pupilem",
    description: "AI, własny weterynarz 24/7, wizyty, przypomnienia i historia pupila w jednym miejscu.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "PupilCare" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PupilCare — cała opieka nad pupilem",
    description: "AI, własny weterynarz 24/7, wizyty, przypomnienia i historia pupila w jednym miejscu.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
