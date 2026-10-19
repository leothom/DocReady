import {reviewSettingsSchema,type ExtractedDeck,type ReviewSettings} from "../contracts";
import {createBatches} from "./batches";
import {FindingValidationError,validateFindings} from "./findings";
import {ReviewError,type ReviewAttempt,type ReviewRetryContext,type AttemptMetrics,type BatchOutcome,type EnglishChecker,type Progress,type ReviewBatch,type ReviewResult} from "./types";
import {validationReasonsSchema} from "./transport";
export type AnalyzeOptions={timeoutMs?:number;retryDelayMs?:number;extractionMs?:number|null;now?:()=>number};
const unknownMetrics=(elapsedMs:number):AttemptMetrics=>({elapsedMs,usage:{inputTokens:null,outputTokens:null,cachedInputTokens:null},costUsd:null,model:"unknown"});
async function sourceKey(deck:ExtractedDeck,settings:ReviewSettings){
 const data=JSON.stringify({settings,slides:deck.slides});
 const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(data));
 return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,"0")).join("");
}
async function attempt(checker:EnglishChecker,batch:ReviewBatch,settings:ReviewSettings,signal:AbortSignal,timeoutMs:number,context?:ReviewRetryContext){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 let abort:()=>void=()=>{};
 const interrupted=new Promise<never>((_,reject)=>{
  abort=()=>{controller.abort();reject(new ReviewError("CANCELLED"));};
  signal.addEventListener("abort",abort,{once:true});
  timer=setTimeout(()=>{controller.abort();reject(new ReviewError("MODEL_TIMEOUT",true));},timeoutMs);
 });
 try {
  if(signal.aborted)throw new ReviewError("CANCELLED");
  return await Promise.race([checker.check(batch.slides,settings,controller.signal,context),interrupted]);
 }finally{clearTimeout(timer);signal.removeEventListener("abort",abort);}
}
async function delay(ms:number,signal:AbortSignal){
 if(signal.aborted)return;
 await new Promise<void>(resolve=>{
  const finish=()=>{clearTimeout(timer);signal.removeEventListener("abort",finish);resolve();};
  const timer=setTimeout(finish,ms);signal.addEventListener("abort",finish,{once:true});
 });
}
async function run(deck:ExtractedDeck,input:ReviewSettings,checker:EnglishChecker,onProgress:(p:Progress)=>void,signal:AbortSignal,options:AnalyzeOptions,previous?:ReviewResult):Promise<ReviewResult>{
 const settings=reviewSettingsSchema.parse(input),now=options.now??Date.now,started=now();
 const key=await sourceKey(deck,settings);
 if(previous&&previous.sourceKey!==key)throw new Error("INVALID_RETRY");
 const batches=createBatches(deck);
 const old=new Map(previous?.batches.map(b=>[b.id,b])??[]);
 const selected=previous?batches.filter(b=>old.get(b.id)?.status==="failed"):batches;
 const results=new Map(old);let cursor=0,completed=0,active=0,failed=0;
 let credentialFailure:string|null=null;
 function progress(stage:Progress["stage"]){
  try{onProgress({stage,completedBatches:completed,totalBatches:selected.length,failedBatches:failed,activeBatches:active});}catch{/* A display callback must not discard completed results. */}
 }
 progress("reviewing");
 async function worker(){
  while(cursor<selected.length&&!signal.aborted&&!credentialFailure){
   const batch=selected[cursor++],prior=old.get(batch.id);
   const attempts:ReviewAttempt[]=[...(prior?.attempts??[])];let automaticRetries=prior?.automaticRetries??0;
   active++;progress("reviewing");
   let outcome:BatchOutcome={id:batch.id,slideNumbers:batch.slides.map(s=>s.slideNumber),status:"failed",findings:[],attempts,automaticRetries};
   let retryContext:ReviewRetryContext|undefined;
   for(let n=0;n<2;n++){
    if(credentialFailure){outcome.errorCode=credentialFailure;break;}
    if(signal.aborted){outcome.status="cancelled";outcome.errorCode="CANCELLED";break;}
    if(n>0){automaticRetries++;outcome.automaticRetries=automaticRetries;}
    const began=now();let metrics:AttemptMetrics|null=null;
    try{
     const result=await attempt(checker,batch,settings,signal,options.timeoutMs??60000,retryContext);
     metrics={usage:result.usage,elapsedMs:result.elapsedMs,costUsd:result.costUsd,model:result.model};
     const findings=validateFindings({findings:result.findings},batch.slides);
     attempts.push(metrics);outcome={...outcome,status:"reviewed",findings};delete outcome.errorCode;break;
    }catch(error){
     const failure=error instanceof ReviewError?error:new ReviewError("INVALID_MODEL_OUTPUT",true,0,null,error instanceof FindingValidationError?error.validationReasons:[]);
     const reasons=validationReasonsSchema.safeParse(failure.validationReasons);
     const validationReasons=reasons.success?reasons.data:[];
     attempts.push({...metrics??failure.metrics??unknownMetrics(Math.max(0,now()-began)),errorCode:failure.code,validationReasons});
     retryContext=failure.code==="INVALID_MODEL_OUTPUT"?{validationReasons}:undefined;
     if(signal.aborted||failure.code==="CANCELLED"){outcome.status="cancelled";outcome.errorCode="CANCELLED";break;}
     outcome.errorCode=failure.code;
     if(failure.code==="PERSONAL_KEY_FAILED"||failure.code==="PERSONAL_KEY_INVALID")credentialFailure=failure.code;
     if(!failure.retryable||n===1)break;
     await delay(Math.min(3000,Math.max(0,options.retryDelayMs??(failure.retryAfterMs||500))),signal);
    }
   }
   results.set(batch.id,outcome);active--;completed++;if(outcome.status==="failed")failed++;progress("reviewing");
  }
 }
 await Promise.all([worker(),worker()]);
 for(const batch of selected)if(!results.has(batch.id)||signal.aborted&&results.get(batch.id)===old.get(batch.id)){
  const prior=old.get(batch.id);
  results.set(batch.id,{id:batch.id,slideNumbers:batch.slides.map(s=>s.slideNumber),status:credentialFailure?"failed":"cancelled",findings:[],attempts:prior?.attempts??[],automaticRetries:prior?.automaticRetries??0,errorCode:credentialFailure??"CANCELLED"});
 }
 progress("preparing");
 const outcomes=batches.map(b=>results.get(b.id)!).filter(Boolean);
 const bySlide=new Map(outcomes.flatMap(b=>b.slideNumbers.map(n=>[n,b] as const)));
 const slides:ReviewResult["slides"]=deck.slides.map(slide=>{
  if(slide.extractionStatus==="failed")return {slideNumber:slide.slideNumber,status:"failed",errorCode:"EXTRACTION_FAILED"};
  const batch=bySlide.get(slide.slideNumber);
  return batch?{slideNumber:slide.slideNumber,status:batch.status,...(batch.errorCode?{errorCode:batch.errorCode}:{})}:{slideNumber:slide.slideNumber,status:"skipped"};
 });
 const findings=outcomes.flatMap(b=>b.findings).sort((a,b)=>a.slideNumber-b.slideNumber||a.elementId.localeCompare(b.elementId)||a.reviewType.localeCompare(b.reviewType));
 const attempts=outcomes.flatMap(b=>b.attempts);
 const knownInputTokens=attempts.reduce((n,a)=>n+(a.usage.inputTokens??0),0),knownOutputTokens=attempts.reduce((n,a)=>n+(a.usage.outputTokens??0),0);
 const usageComplete=attempts.every(a=>a.usage.inputTokens!==null&&a.usage.outputTokens!==null);
 const costComplete=attempts.every(a=>a.costUsd!==null);
 const reviewMs=(previous?.metrics.reviewMs??0)+Math.max(0,now()-started);
 const extractionMs=previous?.metrics.extractionMs??options.extractionMs??null;
 const warnings=[...new Set([...deck.warnings,...deck.slides.flatMap(s=>s.warnings),...(batches.length?[]:["NO_EDITABLE_TEXT"])])];
 const hasFailed=slides.some(s=>s.status==="failed"),hasReviewed=slides.some(s=>s.status==="reviewed");
 const status=signal.aborted||slides.some(s=>s.status==="cancelled")?"cancelled":hasFailed?(hasReviewed?"partial":"failed"):"complete";
 progress("complete");
 return {status,findings,slides,batches:outcomes,warnings,sourceKey:key,settings,metrics:{
  extractionMs,reviewMs,modelMs:attempts.reduce((n,a)=>n+a.elapsedMs,0),totalMs:extractionMs===null?null:extractionMs+reviewMs,
  inputTokens:usageComplete?knownInputTokens:null,outputTokens:usageComplete?knownOutputTokens:null,knownInputTokens,knownOutputTokens,
  costUsd:costComplete?attempts.reduce((n,a)=>n+(a.costUsd??0),0):null,knownCostUsd:attempts.reduce((n,a)=>n+(a.costUsd??0),0),
  automaticRetries:outcomes.reduce((n,b)=>n+b.automaticRetries,0),manualRetryRuns:(previous?.metrics.manualRetryRuns??0)+(previous?1:0),usageComplete,attempts:attempts.length,
 }};
}
export function analyzeDeck(deck:ExtractedDeck,settings:ReviewSettings,checker:EnglishChecker,progress:(p:Progress)=>void,signal:AbortSignal,options:AnalyzeOptions={}){return run(deck,settings,checker,progress,signal,options);}
export function retryFailedBatches(deck:ExtractedDeck,settings:ReviewSettings,previous:ReviewResult,checker:EnglishChecker,progress:(p:Progress)=>void,signal:AbortSignal,options:AnalyzeOptions={}){return run(deck,settings,checker,progress,signal,options,previous);}
