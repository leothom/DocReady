import type {Metadata} from "next";
import {LocaleProvider} from "../lib/i18n/provider";
import "./globals.css";
export const metadata:Metadata={title:"DocReady | English review",description:"Review the English in your teaching slides.",robots:{index:false,follow:false},referrer:"no-referrer"};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body><LocaleProvider>{children}</LocaleProvider></body></html>;}
