import {requestPersonalKey} from "./request-key";
import {createAccessService} from "./access";
import {ReviewError,type EnglishChecker} from "../review/types";
import {attemptMetricsSchema,batchResultSchema,requestSchema,reviewErrorCodes,validationReasonsSchema} from "../review/transport";
import {FindingValidationError,validateFindings} from "../review/findings";
import type {Slide} from "../contracts";
import {limitedText,safeJson} from "./http";
import {StoreError,type InviteStore} from './store';
export type ReviewServiceOptions={access:ReturnType<typeof createAccessService>;checker:EnglishChecker;personalChecker?:(apiKey:string)=>EnglishChecker;timeoutMs?:number;now?:()=>number;takeAllowance?:()=>boolean;store?:()=>InviteStore};
export function createReviewService({access,checker,personalChecker,timeoutMs=60000,now=Date.now,takeAllowance=()=>true,store}:ReviewServiceOptions){
 let active=0;const sessions=new Map<string,number>(),fallbackRates=new Map<string,{count:number;expires:number}>();
 function limited(key:string,max:number){
  if(store) return store().checkRate(key,max);
  const time=now();for(const [id,value] of fallbackRates)if(value.expires<=time)fallbackRates.delete(id);
  const value=fallbackRates.get(key)??{count:0,expires:time+60000};value.count++;fallbackRates.set(key,value);return value.count>max;
 }
 return {async review(request:Request):Promise<Response>{
  const auth=access.authorize(request);if(auth instanceof Response)return auth;
  let personalKey:string|null;
  try{personalKey=requestPersonalKey(request);}catch{return safeJson({error:"PERSONAL_KEY_INVALID",retryable:false},400);}
  if(personalKey!==null&&!personalChecker)return safeJson({error:"NOT_CONFIGURED",retryable:false},503);
  if(active>=6||(sessions.get(auth.sessionId)??0)>=2)return safeJson({error:"TOO_MANY_REQUESTS",retryable:true,retryAfterMs:500},429,{"Retry-After":"1"});
  if(limited("global",120)||limited(auth.sessionId,40))return safeJson({error:"TOO_MANY_REQUESTS",retryable:true,retryAfterMs:60000},429,{"Retry-After":"60"});
  active++;sessions.set(auth.sessionId,(sessions.get(auth.sessionId)??0)+1);
  const controller=new AbortController(),signal=AbortSignal.any([controller.signal,request.signal]);
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let ledgerId:string|undefined;
  try{
   let raw:unknown;
   try{raw=JSON.parse(await limitedText(request.body,2*1024*1024,signal));}
   catch(error){if(signal.aborted)throw error;return safeJson({error:error instanceof Error&&error.message==="SIZE_LIMIT"?"REQUEST_TOO_LARGE":"INVALID_REQUEST",retryable:false},error instanceof Error&&error.message==="SIZE_LIMIT"?413:400);}
   const parsed=requestSchema.safeParse(raw);if(!parsed.success)return safeJson({error:"INVALID_REQUEST",retryable:false},400);
   const {slides:input,settings,retryContext}=parsed.data;const numbers=new Set<number>(),ids=new Set<string>();
   let characters=0,elements=0;
   for(const slide of input){
    if(numbers.has(slide.slideNumber))return safeJson({error:"INVALID_REQUEST",retryable:false},400);numbers.add(slide.slideNumber);
    for(const element of slide.elements){const id=slide.slideNumber+"/"+element.elementId;if(ids.has(id)||!element.text.trim())return safeJson({error:"INVALID_REQUEST",retryable:false},400);ids.add(id);characters+=element.text.length;elements++;}
   }
   if(elements>5000||characters>150000||input.length>1&&characters>12000)return safeJson({error:"INVALID_REQUEST",retryable:false},400);
   if(store){
    if(!auth.inviteId||!parsed.data.reviewId||!parsed.data.requestId)return safeJson({error:'INVALID_REQUEST',retryable:false},400);
    try{store().reserve({inviteId:auth.inviteId,generation:auth.generation,reviewId:parsed.data.reviewId,requestId:parsed.data.requestId,slideNumbers:input.map(s=>s.slideNumber),kind:'review',payer:personalKey===null?'school':'personal'});ledgerId=parsed.data.requestId;}
    catch(error){
     const code=error instanceof StoreError?error.code:'';
     const mapped=code==='DUPLICATE_REQUEST'?['RESULT_UNAVAILABLE',409]:code==='QUOTA_EXCEEDED'?['DAILY_LIMIT',429]:code==='INVALID_REQUEST'?['INVALID_REQUEST',400]:code==='INVITE_REQUIRED'?['INVITE_REQUIRED',401]:['NOT_CONFIGURED',503];
     return safeJson({error:mapped[0],retryable:false},Number(mapped[1]));
    }
   }else if(personalKey===null&&!takeAllowance())return safeJson({error:'TOO_MANY_REQUESTS',retryable:false},429);
   const slides:Slide[]=input.map(s=>({...s,hidden:false,warnings:[],extractionStatus:"read",elements:s.elements.map(e=>({...e,shapeName:""}))}));
   let rejectAbort:(reason:unknown)=>void=()=>{};
   const interrupted=new Promise<never>((_,reject)=>{rejectAbort=reject;});
   const aborted=()=>rejectAbort(new ReviewError(controller.signal.aborted?"MODEL_TIMEOUT":"CANCELLED",controller.signal.aborted));
   signal.addEventListener("abort",aborted,{once:true});
   try{
    if(signal.aborted)aborted();
    const result=await Promise.race([(personalKey===null?checker:personalChecker!(personalKey)).check(slides,settings,signal,retryContext),interrupted]);
    const checked=batchResultSchema.safeParse(result);if(!checked.success)throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,null,["SCHEMA"]);
    try{validateFindings({findings:checked.data.findings},slides);}catch(error){throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,{usage:checked.data.usage,elapsedMs:checked.data.elapsedMs,costUsd:checked.data.costUsd,model:checked.data.model},error instanceof FindingValidationError?error.validationReasons:["SCHEMA"]);}
    if(ledgerId)store!().finish(ledgerId,'success',checked.data);
    return safeJson(checked.data);
   }finally{signal.removeEventListener("abort",aborted);}
  }catch(error){
   if(ledgerId){try{store!().finish(ledgerId,'failed',error instanceof ReviewError?error.metrics??undefined:undefined,error instanceof ReviewError?error.code:'MODEL_UNAVAILABLE');}catch{/* Reservation stays consumed if accounting is unavailable. */}}
   if(request.signal.aborted)return safeJson({error:"CANCELLED",retryable:false},499);
   if(controller.signal.aborted)return safeJson({error:"MODEL_TIMEOUT",retryable:true},504);
   const failure=personalKey!==null&&error instanceof ReviewError&&error.code==="MODEL_ACCESS_FAILED"?new ReviewError("PERSONAL_KEY_FAILED"):error instanceof ReviewError?error:new ReviewError("MODEL_UNAVAILABLE",true);
   const code=(reviewErrorCodes as readonly string[]).includes(failure.code)?failure.code:"MODEL_UNAVAILABLE";
   return safeJson({error:code,retryable:failure.retryable,retryAfterMs:failure.retryAfterMs,metrics:attemptMetricsSchema.safeParse(failure.metrics).success?failure.metrics:null,validationReasons:validationReasonsSchema.safeParse(failure.validationReasons).success?failure.validationReasons:[]},502);
  }finally{clearTimeout(timer);active--;const count=(sessions.get(auth.sessionId)??1)-1;if(count)sessions.set(auth.sessionId,count);else sessions.delete(auth.sessionId);}
 }};
}
