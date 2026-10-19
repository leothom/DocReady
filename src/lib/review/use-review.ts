"use client";
import {accountHeaders,validPersonalKey} from "../personal-key";
import {useEffect,useRef,useState} from "react";
import type {ExtractedDeck,ReviewSettings} from "../contracts";
import {createLocalReader,type ReadState} from "../docx/reader";
import {analyzeDeck,retryFailedBatches} from "./analyze";
import {createHttpChecker} from "./client";
import type {Progress,ReviewResult} from "./types";
export function useReview(personalKey:string|null=null){
 const [readState,setReadState]=useState<ReadState>({status:"idle"});
 const [fileName,setFileName]=useState("");
 const [deck,setDeck]=useState<ExtractedDeck|null>(null);
 const [result,setResult]=useState<ReviewResult|null>(null);
 const [progress,setProgress]=useState<Progress|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const reader=useRef<ReturnType<typeof createLocalReader>|null>(null),controller=useRef<AbortController|null>(null);
 const generation=useRef(0),readStarted=useRef(0),extractionMs=useRef<number|null>(null),running=useRef(false);
 const reviewId=useRef<string|null>(null),reviewAccount=useRef<string|null>(null);
 useEffect(()=>{if(running.current)controller.current?.abort();},[personalKey]);
 useEffect(()=>{
  const lifecycle=generation;
  reader.current=createLocalReader(()=>new Worker(new URL("../docx/extract.worker.ts",import.meta.url),{type:"module"}),state=>{
   setReadState(state);
   if(state.status==="done"){setDeck(state.deck);extractionMs.current=Math.max(0,performance.now()-readStarted.current);}
   if(state.status==="error")setError(state.code);
  });
  return ()=>{lifecycle.current++;controller.current?.abort();reader.current?.dispose();reader.current=null;};
 },[]);
 function clear(){
  reviewId.current=null;reviewAccount.current=null;
  generation.current++;controller.current?.abort();controller.current=null;running.current=false;reader.current?.dispose();
  setResult(null);setDeck(null);setProgress(null);setBusy(false);setError(null);setFileName("");setReadState({status:"idle"});extractionMs.current=null;
 }
 function read(file:File){clear();setFileName(file.name);readStarted.current=performance.now();void reader.current?.read(file);}
 async function review(settings:ReviewSettings,retry=false){
  if(!deck||running.current||readState.status==="reading")return;
  if(personalKey!==null&&!validPersonalKey(personalKey)){setError("PERSONAL_KEY_INVALID");return;}
  if(retry&&reviewAccount.current!==personalKey){setError("ACCOUNT_CHANGED");return;}
  const runKey=personalKey;reviewAccount.current=runKey;
  const run=++generation.current,c=new AbortController();controller.current=c;running.current=true;setBusy(true);setError(null);
  if(!retry){setResult(null);}
  setProgress({stage:"reviewing",completedBatches:0,totalBatches:0,failedBatches:0,activeBatches:0});
  const notify=(p:Progress)=>{if(run===generation.current)setProgress(p);};
  try{
   if(!retry||!reviewId.current){
    const numbers=deck.slides.filter(s=>s.extractionStatus!=='failed'&&s.elements.some(e=>e.text.trim())).map(s=>s.slideNumber);
    if(numbers.length){
     const response=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json',...accountHeaders(runKey)},body:JSON.stringify({slideNumbers:numbers}),signal:c.signal});
     if(run!==generation.current||c.signal.aborted)return;
     if(!response.ok){const failure=await response.json();setError(response.status===401?'INVITE_REQUIRED':response.status===429?(failure.error==='DAILY_LIMIT'?'DAILY_LIMIT':'TOO_MANY_REQUESTS'):failure.error==='PERSONAL_KEY_INVALID'?'PERSONAL_KEY_INVALID':'REVIEW_FAILED');return;}
     const data=await response.json();if(run!==generation.current||c.signal.aborted)return;if(typeof data.reviewId!=='string')throw new Error('REVIEW_FAILED');reviewId.current=data.reviewId;
    }
   }
   const checker=createHttpChecker(fetch,reviewId.current??undefined,runKey);
   const next=retry&&result?await retryFailedBatches(deck,result.settings,result,checker,notify,c.signal):await analyzeDeck(deck,settings,checker,notify,c.signal,{extractionMs:extractionMs.current});
   if(run===generation.current)setResult(next);
  }catch{if(run===generation.current)setError("REVIEW_FAILED");}
  finally{if(run===generation.current){running.current=false;controller.current=null;setBusy(false);setProgress(null);}}
 }
 function cancel(){if(readState.status==="reading")reader.current?.cancel();controller.current?.abort();}
 return {readState,fileName,deck,result,progress,busy,error,clear,read,review,cancel};
}
