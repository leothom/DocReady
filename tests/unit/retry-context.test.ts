import {it,expect,vi} from "vitest";
import {createAccessService} from "../../src/lib/server/access";
import {createReviewService} from "../../src/lib/server/review";
import {createDeepSeekChecker} from "../../src/lib/server/deepseek";
import {createPilotChecker} from "../support/pilot-checker";
import {analyzeDeck} from "../../src/lib/review/analyze";
import {buildReviewMessages} from "../../src/lib/review/prompt";
import {ReviewError,type EnglishChecker} from "../../src/lib/review/types";
import {reviewSlide,reviewDeck,goodResult} from "../fixtures/review-deck";
const config={apiKey:"invented",model:"deepseek-flash",origin:"http://localhost:3100",inviteSecret:"a".repeat(64),sessionSecret:"b".repeat(64),inviteVersion:"1",enabled:true};
const settings={subject:"Business",toeflLevel:3} as const;
async function app(fetcher:typeof fetch){
 const access=createAccessService({config}),service=createReviewService({access,checker:createDeepSeekChecker({apiKey:config.apiKey,model:config.model,fetcher})});
 return createPilotChecker({origin:config.origin,invite:config.inviteSecret,fetcher:async(url,init)=>{
  const request=new Request(String(url),init);return new URL(request.url).pathname==="/api/invite"?access.invite(request):service.review(request);
 }});
}
it.each([true,false])("one invalid attempt gets reason feedback; valid retry=%s",async fix=>{
 const deck=reviewDeck(Array.from({length:6},(_,i)=>reviewSlide(i+1)));
 const prompts:string[]=[];
 const checker=await app(async(_url,init)=>{
  const request=JSON.parse(String(init?.body)),number=JSON.parse(request.input).slides[0].slideNumber;
  let f=goodResult([deck.slides[number===1?0:5]],true).findings[0];
  if(number===6){
   prompts.push(request.instructions);
   if(!fix||!request.instructions.includes("Retry after invalid output"))f={...f,suggestedText:f.originalText};
  }
  return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify({findings:[f]})}]}],usage:{input_tokens:100,output_tokens:20}});
 });
 const result=await analyzeDeck(deck,settings,checker,()=>{},new AbortController().signal,{retryDelayMs:0});
 expect(prompts).toHaveLength(2);expect(prompts[0]).not.toContain("Retry after invalid output");
 expect(prompts[1]).toContain("Retry after invalid output");expect(prompts[1]).toContain("UNCHANGED");
 expect(result.metrics.attempts).toBe(3);expect(result.metrics.automaticRetries).toBe(1);expect(result.metrics.inputTokens).toBe(300);
 expect(result.status).toBe(fix?"complete":"partial");
 expect(result.findings.map(f=>f.slideNumber)).toEqual(fix?[1,6]:[1]);
 expect(result.batches[1].attempts[0]).toMatchObject({errorCode:"INVALID_MODEL_OUTPUT",validationReasons:["UNCHANGED"]});
});
it.each(["MODEL_TIMEOUT","TOO_MANY_REQUESTS"])("ordinary %s retries have no validation context",async code=>{
 const check=vi.fn<EnglishChecker["check"]>().mockRejectedValueOnce(new ReviewError(code,true)).mockImplementation(async b=>goodResult(b));
 await analyzeDeck(reviewDeck([reviewSlide(1)]),settings,{check},()=>{},new AbortController().signal,{retryDelayMs:0});
 expect(check.mock.calls[1][3]).toBeUndefined();
});
it("uses a generic reminder if old invalid output has no reasons",async()=>{
 const check=vi.fn<EnglishChecker["check"]>().mockRejectedValueOnce(new ReviewError("INVALID_MODEL_OUTPUT",true)).mockImplementation(async b=>goodResult(b));
 await analyzeDeck(reviewDeck([reviewSlide(1)]),settings,{check},()=>{},new AbortController().signal,{retryDelayMs:0});
 expect(check.mock.calls[1][3]).toEqual({validationReasons:[]});
});
it("cancellation during the retry delay prevents a second paid call",async()=>{
 const controller=new AbortController();
 const check=vi.fn<EnglishChecker["check"]>(async()=>{setTimeout(()=>controller.abort(),1);throw new ReviewError("INVALID_MODEL_OUTPUT",true);});
 const result=await analyzeDeck(reviewDeck([reviewSlide(1)]),settings,{check},()=>{},controller.signal,{retryDelayMs:30});
 expect(result.status).toBe("cancelled");expect(check).toHaveBeenCalledOnce();expect(result.metrics.automaticRetries).toBe(0);
});
it("rejects unknown retry reasons, extra fields and more than ten codes before model access",async()=>{
 const access=createAccessService({config}),check=vi.fn<EnglishChecker["check"]>(),service=createReviewService({access,checker:{check}});
 const login=await access.invite(new Request(config.origin+"/api/invite",{method:"POST",headers:{origin:config.origin,"Content-Type":"application/json"},body:JSON.stringify({token:config.inviteSecret})}));
 const cookie=login.headers.get("set-cookie")!.split(";")[0];
 const slides=[reviewSlide(1)].map(s=>({slideNumber:s.slideNumber,elements:s.elements.map(e=>({shapeId:e.shapeId,elementId:e.elementId,text:e.text}))}));
 for(const retryContext of [{validationReasons:["reveal private text"]},{validationReasons:["UNCHANGED"],private:"text"},{validationReasons:Array(11).fill("UNCHANGED")}]){
  const response=await service.review(new Request(config.origin+"/api/review",{method:"POST",headers:{origin:config.origin,cookie,"Content-Type":"application/json"},body:JSON.stringify({settings,slides,retryContext})}));
  expect(response.status).toBe(400);
 }
 expect(check).not.toHaveBeenCalled();
});
it("validates context in the prompt before using fixed reminders",()=>{
 expect(()=>buildReviewMessages([reviewSlide(1)],settings,{validationReasons:["private override"]} as never)).toThrow();
 const message=buildReviewMessages([reviewSlide(1)],settings,{validationReasons:["DUPLICATE","SOURCE_TEXT"]})[0].content;
 expect(message).toContain("Retry after invalid output");expect(message).toContain("DUPLICATE");expect(message).toContain("SOURCE_TEXT");
});
