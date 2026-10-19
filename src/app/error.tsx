"use client";
import AppFallback from "../components/app-fallback";
export default function ErrorPage({retry}:{error:Error&{digest?:string};retry:()=>void}){return <AppFallback kind="error" retry={retry}/>;}
