"use client";
import {createContext,useContext,useEffect,useState} from "react";
import {resolveLocale,type AppLocale} from "./locale";
import {getMessages} from "./messages";
export const LocaleContext=createContext<{locale:AppLocale;setLocale:(locale:AppLocale)=>void}>({locale:"en",setLocale:()=>{}});
export function LocaleProvider({children}:{children:React.ReactNode}){
 const [locale,updateLocale]=useState<AppLocale>("en");
 useEffect(()=>{let active=true;Promise.resolve().then(()=>{
  let saved:string|null=null;
  try{saved=localStorage.getItem("docready.locale")??localStorage.getItem("docready-language");localStorage.removeItem("docready-language");if(saved==="en"||saved==="zh-Hans")localStorage.setItem("docready.locale",saved);}catch{}
  if(active)updateLocale(resolveLocale(saved,navigator.languages));
 });return ()=>{active=false;};},[]);
 useEffect(()=>{document.documentElement.lang=locale;document.title=getMessages(locale).pageTitle;},[locale]);
 const setLocale=(next:AppLocale)=>{updateLocale(next);try{localStorage.setItem("docready.locale",next);}catch{}};
 return <LocaleContext value={{locale,setLocale}}>{children}</LocaleContext>;
}
export const useLocale=()=>useContext(LocaleContext);
