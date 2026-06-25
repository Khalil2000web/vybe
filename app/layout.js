import "./globals.css";
import { Roboto_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import NavigationLoading from "@/app/components/NavigationLoading";

const mono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--mono",
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || "CARTYR";

export const metadata = {
  title: appName,
  description: `${appName}.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="min-h-screen font-[var(--mono)]">
        <NavigationLoading />
        {children}
        <Analytics />
      </body>
    </html>
  );
}