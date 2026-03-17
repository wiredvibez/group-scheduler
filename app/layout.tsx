import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "./providers";

const fbTipograf = localFont({
  src: [
    { path: "../public/fonts/FbTipograf-Light.otf", weight: "300" },
    { path: "../public/fonts/FbTipograf-Regular.otf", weight: "400" },
    { path: "../public/fonts/FbTipograf-Bold.otf", weight: "700" },
    { path: "../public/fonts/FbTipograf-Black.otf", weight: "900" },
  ],
  variable: "--font-fb-tipograf",
});

export const metadata: Metadata = {
  title: "יאללה סגרנו | תיאום פגישות לקבוצות",
  description: "מציאת המועד המשותף הטוב ביותר לקבוצות וחברים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${fbTipograf.variable} ${fbTipograf.className} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
