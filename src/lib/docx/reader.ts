import type {ExtractedDeck} from "../contracts";
import {LIMITS} from "./extract";
export type ReadState={status:"idle"|"reading"|"cancelled"}|{status:"done";deck:ExtractedDeck}|{status:"error";code:string};
export interface WorkerPort {postMessage(message:unknown,transfer:Transferable[]):void;terminate():void;onmessage:((event:MessageEvent)=>void)|null;onerror:((event:ErrorEvent)=>void)|null;}
export function createLocalReader(factory:()=>WorkerPort,notify:(state:ReadState)=>void) {
 let worker:WorkerPort|null=null,sequence=0;
 const stop=()=>{worker?.terminate();worker=null;};
 return {
  async read(file:{name:string;size:number;arrayBuffer:()=>Promise<ArrayBuffer>}){
   stop();const requestId=++sequence;
   if(!/\.docx$/i.test(file.name)){notify({status:"error",code:"DOCX_ONLY"});return;}
   if(file.size>LIMITS.fileBytes){notify({status:"error",code:"FILE_TOO_LARGE"});return;}
   notify({status:"reading"});
   try {
    const data=await file.arrayBuffer();if(requestId!==sequence)return;
    worker=factory();const active=worker;
    active.onmessage=event=>{
     if(requestId!==sequence||event.data.requestId!==requestId||worker!==active)return;
     stop();
     if(event.data.type==="result")notify({status:"done",deck:event.data.deck});
     else notify({status:"error",code:typeof event.data.code==="string"?event.data.code:"READ_FAILED"});
    };
    active.onerror=()=>{if(requestId===sequence&&worker===active){stop();notify({status:"error",code:"READ_FAILED"});}};
    active.postMessage({type:"extract",requestId,data},[data]);
   }catch{if(requestId===sequence){stop();notify({status:"error",code:"READ_FAILED"});}}
  },
  cancel(){++sequence;stop();notify({status:"cancelled"});},
  dispose(){++sequence;stop();},
 };
}
