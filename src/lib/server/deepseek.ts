import {z} from "zod";
import {reviewJsonSchema} from "../contracts";
import {buildReviewMessages} from "../review/prompt";
import {FindingValidationError,validateFindings} from "../review/findings";
import {ReviewError,type AttemptMetrics,type EnglishChecker,type Usage} from "../review/types";
import {limitedText} from "./http";
function stripFences(text:string):string{
 const trimmed=text.trim();
 const fenced=/^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
 return fenced?fenced[1]:trimmed;
}
export type PriceTier="peak"|"off_peak"|null;
export type DeepSeekOptions={apiKey:string;model:string;priceTier?:PriceTier;fetcher?:typeof fetch;timeoutMs?:number;now?:()=>number};
const envelope=z.object({status:z.string(),output:z.array(z.object({type:z.string(),role:z.string().optional(),content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional()})),usage:z.unknown().optional()});
const usageSchema=z.object({input_tokens:z.number().int().nonnegative().max(10000000),output_tokens:z.number().int().nonnegative().max(10000000),input_tokens_details:z.object({cached_tokens:z.number().int().nonnegative()}).optional()});
function usageOf(raw:unknown):Usage {
 const result=usageSchema.safeParse(raw);
 if(!result.success)return {inputTokens:null,outputTokens:null,cachedInputTokens:null};
 const u=result.data,cached=u.input_tokens_details?.cached_tokens??null;
 return {inputTokens:u.input_tokens,outputTokens:u.output_tokens,cachedInputTokens:cached!==null&&cached<=u.input_tokens?cached:null};
}
// USD per million tokens. Checked 2026-10-05. Unknown tier or cache usage means unknown cost.
function estimate(model:string,tier:PriceTier,usage:Usage){
 const {inputTokens,outputTokens,cachedInputTokens}=usage;
 if(!tier||inputTokens===null||outputTokens===null||cachedInputTokens===null)return null;
 const prices=model==="deepseek-flash"?[.003,.15,.6]:[.022,.66,1.98];
 return (cachedInputTokens*prices[0]+(inputTokens-cachedInputTokens)*prices[1]+outputTokens*prices[2])*(tier==="peak"?2:1)/1e6;
}
export function createDeepSeekChecker({apiKey,model,priceTier=null,fetcher=fetch,timeoutMs=60000,now=Date.now}:DeepSeekOptions):EnglishChecker{
 return {async check(batch,settings,signal,context){
  if(!apiKey||!["deepseek-flash","deepseek-v4-pro"].includes(model))throw new ReviewError("NOT_CONFIGURED");
  if(signal.aborted)throw new ReviewError("CANCELLED");
  const messages=buildReviewMessages(batch,settings,context),started=now(),controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let metrics:AttemptMetrics|null=null;
  try{
   const response=await fetcher("https://api.deepseek.com/responses",{
    method:"POST",redirect:"error",cache:"no-store",signal:AbortSignal.any([controller.signal,signal]),
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},
    body:JSON.stringify({model,reasoning:{effort:"none"},stream:false,max_output_tokens:8192,temperature:0,
     instructions:messages[0].content,input:messages[1].content,
     text:{format:{type:"json_schema",name:"slide_review",schema:reviewJsonSchema}},
    }),
   });
   if(!response.ok){
    await response.body?.cancel();
    const retryable=response.status===429||response.status>=500;
    const seconds=Number(response.headers.get("retry-after"));
    const retryAfterMs=Number.isFinite(seconds)?Math.min(60000,Math.max(0,seconds*1000)):0;
    throw new ReviewError(response.status===400?"MODEL_REQUEST_REJECTED":[401,402,403].includes(response.status)?"MODEL_ACCESS_FAILED":response.status===429?"TOO_MANY_REQUESTS":"MODEL_UNAVAILABLE",retryable,retryAfterMs);
   }
   const raw:unknown=JSON.parse(await limitedText(response.body,1024*1024,AbortSignal.any([controller.signal,signal])));
   const parsed=envelope.safeParse(raw);
   const usage=usageOf(typeof raw==="object"&&raw!==null&&"usage" in raw?raw.usage:undefined);
   metrics={usage,elapsedMs:Math.max(0,now()-started),costUsd:estimate(model,priceTier,usage),model};
   if(!parsed.success)throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,metrics,["ENVELOPE"]);
   if(parsed.data.status!=="completed")throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,metrics,["INCOMPLETE"]);
   const text=parsed.data.output.filter(x=>x.type==="message"&&x.role==="assistant").flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join("");
   const content:unknown=JSON.parse(stripFences(text));validateFindings(content,batch);
   const findings=(content as {findings:import("../contracts").ModelFinding[]}).findings;
   return {...metrics,findings};
  }catch(error){
   if(signal.aborted)throw new ReviewError("CANCELLED",false,0,metrics);
   if(controller.signal.aborted)throw new ReviewError("MODEL_TIMEOUT",true,0,metrics);
   if(error instanceof ReviewError)throw error;
   if(error instanceof FindingValidationError)throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,metrics,error.validationReasons);
   if(error instanceof SyntaxError)throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,metrics,["JSON"]);
   if(error instanceof Error&&error.message==="SIZE_LIMIT")throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,metrics,["SIZE_LIMIT"]);
   throw new ReviewError("MODEL_UNAVAILABLE",true,0,metrics);
  }finally{clearTimeout(timer);}
 }};
}
