import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit, Space_Grotesk, Raleway, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const robotoSlab = Roboto_Slab({subsets:['latin'],variable:'--font-serif'});

const geistMonoHeading = Geist_Mono({subsets:['latin'],variable:'--font-heading'});

const raleway = Raleway({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MusicLab - Estudio de Composición e Inteligencia Armónica",
  description: "Plataforma de composición asistida por Inteligencia Artificial y secuenciación polifónica MIDI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn( raleway.variable, geistMonoHeading.variable, "font-serif", robotoSlab.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
