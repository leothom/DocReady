import {accountHeaders} from "../personal-key";
import {batchResultSchema,errorTransportSchema} from "./transport";
import {FindingValidationError,validateFindings} from "./findings";
import {ReviewError,type EnglishChecker} from "./types";
async function responseText(response:Response,signal:AbortSignal){
 if(!response.body)return "";const reader=response.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});let bytes=0,text="";
 const stop=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener("abort",stop,{once:true});
 try{
  while(true){if(signal.aborted)throw new ReviewError("CANCELLED");const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>1024*1024){await reader.cancel();throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,null,["SIZE_LIMIT"]);}text+=decoder.decode(chunk.value,{stream:true});}
  if(signal.aborted)throw new ReviewError("CANCELLED");return text+decoder.decode();
 }finally{signal.removeEventListener("abort",stop);reader.releaseLock();}
}
export function createHttpChecker(fetcher:typeof fetch=fetch,reviewId?:string,personalKey:string|null=null):EnglishChecker{
 return {async check(batch,settings,signal,context){
  if(signal.aborted)throw new ReviewError("CANCELLED");
  try{
   const response=await fetcher("/api/review",{method:"POST",cache:"no-store",redirect:"error",credentials:"same-origin",signal,
    headers:{"Content-Type":"application/json",...accountHeaders(personalKey)},
    body:JSON.stringify({settings,...(reviewId?{reviewId,requestId:crypto.randomUUID()}:{}),...(context?{retryContext:context}:{}),slides:batch.map(s=>({slideNumber:s.slideNumber,elements:s.elements.map(e=>({shapeId:e.shapeId,elementId:e.elementId,text:e.text}))}))}),
   });
   let raw:unknown;
   try{raw=JSON.parse(await responseText(response,signal));}catch(error){if(signal.aborted)throw new ReviewError("CANCELLED");if(error instanceof ReviewError)throw error;throw new ReviewError(response.ok?"INVALID_MODEL_OUTPUT":"MODEL_UNAVAILABLE",true);}
   if(!response.ok){
    const parsed=errorTransportSchema.safeParse(raw);
    if(!parsed.success)throw new ReviewError("MODEL_UNAVAILABLE",response.status>=500);
    throw new ReviewError(parsed.data.error,parsed.data.retryable??false,parsed.data.retryAfterMs??0,parsed.data.metrics??null,parsed.data.validationReasons??[]);
   }
   const parsed=batchResultSchema.safeParse(raw);if(!parsed.success)throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,null,["SCHEMA"]);
   try{validateFindings({findings:parsed.data.findings},batch);}catch(error){throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,{usage:parsed.data.usage,elapsedMs:parsed.data.elapsedMs,costUsd:parsed.data.costUsd,model:parsed.data.model},error instanceof FindingValidationError?error.validationReasons:["SCHEMA"]);}
   return parsed.data;
  }catch(error){
   if(signal.aborted)throw new ReviewError("CANCELLED");
   if(error instanceof ReviewError)throw error;
   throw new ReviewError("MODEL_UNAVAILABLE",true);
  }
 }};
}
