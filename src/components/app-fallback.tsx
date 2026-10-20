"use client";
import {useLocale} from "../lib/i18n/provider";
import {getMessages} from "../lib/i18n/messages";
import Link from "next/link";
import LanguageSwitch from "./language-switch";
import {BrandMark} from "./brand-mark";
export default function AppFallback({kind,retry}:{kind:"error"|"notFound";retry?:()=>void}){
 const {locale}=useLocale(),w=getMessages(locale);
 return <main><header><span className="brand"><BrandMark />DocReady</span><LanguageSwitch/></header><h1>{kind==="error"?w.appError:w.notFound}</h1>{retry&&<button onClick={retry}>{w.tryAgain}</button>}<p><Link href="/">{w.returnHome}</Link></p></main>;
}
