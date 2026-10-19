import {it,expect} from "vitest";
import {createDeepSeekChecker} from "../../src/lib/server/deepseek";
import {createAccessService} from "../../src/lib/server/access";
import {createReviewService} from "../../src/lib/server/review";
import {createPilotChecker} from "../support/pilot-checker";
import {validateFindings} from "../../src/lib/review/findings";
import {reviewSlide,goodResult} from "../fixtures/review-deck";
import {ReviewError,type EnglishChecker} from "../../src/lib/review/types";
const config={apiKey:"invented",model:"deepseek-flash",origin:"http://localhost:3100",inviteSecret:"a".repeat(64),sessionSecret:"b".repeat(64),inviteVersion:"1",enabled:true};
const batch=[reviewSlide(1)],settings={subject:"Business",toeflLevel:3} as const;
const finding=()=>goodResult(batch,true).findings[0];
function output(text:unknown,status="completed"){
 return {status,output:[{type:"message",role:"assistant",content:[{type:"output_text",text:typeof text==="string"?text:JSON.stringify(text)}]}],usage:{input_tokens:100,output_tokens:20}};
}
async function app(checker:EnglishChecker){
 const access=createAccessService({config}),service=createReviewService({access,checker});
 return createPilotChecker({origin:config.origin,invite:config.inviteSecret,fetcher:async(url,init)=>{
  const request=new Request(String(url),init);
  return new URL(request.url).pathname==="/api/invite"?access.invite(request):service.review(request);
 }});
}
it.each([
 ["ENVELOPE",()=>({output:[]})],
 ["INCOMPLETE",()=>output({findings:[]},"incomplete")],
 ["JSON",()=>output("private lesson is not JSON")],
 ["SCHEMA",()=>output({findings:[{...finding(),category:"private unexpected value"}]})],
 ["SOURCE_ID",()=>output({findings:[{...finding(),elementId:"invented"}]})],
 ["SOURCE_TEXT",()=>output({findings:[{...finding(),originalText:"private forged quote"}]})],
 ["UNCHANGED",()=>output({findings:[{...finding(),suggestedText:finding().originalText}]})],
 ["EMPTY_SUGGESTION",()=>output({findings:[{...finding(),suggestedText:" "}]})],
 ["EMPTY_EXPLANATION",()=>output({findings:[{...finding(),explanation:{en:" ", "zh-Hans":"中文"}}]})],
 ["DUPLICATE",()=>output({findings:[finding(),finding()]})],
] as const)("keeps safe %s reason through the complete app contract",async(reason,raw)=>{
 const checker=await app(createDeepSeekChecker({apiKey:config.apiKey,model:config.model,fetcher:async()=>Response.json(raw())}));
 await expect(checker.check(batch,settings,new AbortController().signal)).rejects.toMatchObject({code:"INVALID_MODEL_OUTPUT",validationReasons:[reason]});
});
it("rejects an oversized response with a safe reason",async()=>{
 const checker=createDeepSeekChecker({apiKey:config.apiKey,model:config.model,fetcher:async()=>new Response("x".repeat(1024*1024+1))});
 await expect(checker.check(batch,settings,new AbortController().signal)).rejects.toMatchObject({code:"INVALID_MODEL_OUTPUT",validationReasons:["SIZE_LIMIT"]});
});
it("keeps usage on a rejected finding",async()=>{
 const checker=await app(createDeepSeekChecker({apiKey:config.apiKey,model:config.model,fetcher:async()=>Response.json(output({findings:[{...finding(),suggestedText:finding().originalText}]}))}));
 await expect(checker.check(batch,settings,new AbortController().signal)).rejects.toMatchObject({metrics:{usage:{inputTokens:100,outputTokens:20}}});
});
it("never returns the valid sibling of a rejected finding",()=>{
 try{validateFindings({findings:[finding(),{...finding(),suggestedText:finding().originalText}]},batch);expect.fail("must reject");}
 catch(error){expect(error).toMatchObject({message:"INVALID_FINDINGS",validationReasons:["UNCHANGED"]});}
});
it("accepts one correction and one enhancement for an element",()=>{
 expect(validateFindings({findings:[finding(),{...finding(),reviewType:"enhancement",category:"clarity",optional:true}]},batch)).toHaveLength(2);
});
it("does not echo untrusted metadata in the error response",async()=>{
 const checker=await app({check:async()=>{const e=new ReviewError("INVALID_MODEL_OUTPUT",true);Object.assign(e,{validationReasons:["private source text"]});throw e;}});
 try{await checker.check(batch,settings,new AbortController().signal);expect.fail("must reject");}
 catch(error){expect(JSON.stringify(error)).not.toContain("private source text");expect(error).toMatchObject({code:"INVALID_MODEL_OUTPUT"});}
});
it("uses safe reasons for server and client validation of a checker result",async()=>{
 const http=await app({check:async()=>({...goodResult(batch,true),findings:[{...finding(),suggestedText:finding().originalText}]})});
 await expect(http.check(batch,settings,new AbortController().signal)).rejects.toMatchObject({validationReasons:["UNCHANGED"]});
});
