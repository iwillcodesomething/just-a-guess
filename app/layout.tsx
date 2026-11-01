import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Just a Guess — Yarını ne kadar iyi okuyorsun?",description:"Her gün 3 tahmin. Gerçek sonuçlar, arkadaş rekabeti ve kendi tahmin yolculuğun.",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="tr"><body>{children}</body></html>}
