import {it,expect,vi} from "vitest";
import {createAccessService} from "../../src/lib/server/access";
import {createReviewService} from "../../src/lib/server/review";
import {ReviewError,type EnglishChecker} from "../../src/lib/review/types";
import {reviewSlide,goodResult} from "../fixtures/review-deck";
const config={apiKey:"test-api-key",model:"deepseek-flash",origin:"http://localhost:3100",inviteSecret:"a".repeat(64),sessionSecret:"b".repeat(64),inviteVersion:"1",enabled:true};
const payload=()=>({settings:{subject:"Business",toeflLevel:3},slides:[{slideNumber:1,elements:[{shapeId:"2",elementId:"slide-1/shape-2",text:"The company sell goods."}]}]});
function request(body:unknown=payload(),cookie="",origin=config.origin){return new Request(config.origin+"/api/review",{method:"POST",headers:{origin,"content-type":"application/json",cookie},body:JSON.stringify(body)});}
async function setup(checker:EnglishChecker={check:async b=>goodResult(b,true)},timeoutMs=1000){
 const access=createAccessService({config});const login=await access.invite(new Request(config.origin+"/api/invite",{method:"POST",headers:{origin:config.origin,"content-type":"application/json"},body:JSON.stringify({token:config.inviteSecret})}));
 return {service:createReviewService({access,checker,timeoutMs}),cookie:login.headers.get("set-cookie")!.split(";")[0],checker};
}
it("requires valid session and matching origin before model access",async()=>{
 const checker={check:vi.fn<EnglishChecker["check"]>()},t=await setup(checker);
 expect((await t.service.review(request())).status).toBe(401);
 expect((await t.service.review(request(payload(),t.cookie,"https://other.example"))).status).toBe(403);expect(checker.check).not.toHaveBeenCalled();
});
it("rejects extra fields, invalid settings, duplicated IDs and batch limits",async()=>{
 const checker={check:vi.fn<EnglishChecker["check"]>()},t=await setup(checker);
 const base=payload();
 for(const body of [{...base,apiKey:"bad"}, {...base,settings:{...base.settings,toeflLevel:2.2}},{...base,slides:[base.slides[0],base.slides[0]]},{...base,slides:[{...base.slides[0],elements:[base.slides[0].elements[0],base.slides[0].elements[0]]}]},{...base,slides:Array.from({length:6},(_,i)=>({...base.slides[0],slideNumber:i+1}))}]){
  expect((await t.service.review(request(body,t.cookie))).status).toBe(400);
 }expect(checker.check).not.toHaveBeenCalled();
});
it("accepts a single oversized slide, but refuses oversized multi-slide batches",async()=>{
 const checker={check:vi.fn<EnglishChecker["check"]>(async b=>goodResult(b))},t=await setup(checker);
 const a={slideNumber:1,elements:[{shapeId:"2",elementId:"e1",text:"x".repeat(13000)}]},base=payload();
 expect((await t.service.review(request({...base,slides:[a]},t.cookie))).status).toBe(200);
 expect((await t.service.review(request({...base,slides:[a,{...a,slideNumber:2,elements:[{...a.elements[0],elementId:"e2"}]}]},t.cookie))).status).toBe(400);
});
it("returns only validated findings and safe metrics with no cache",async()=>{
 const t=await setup();const result=await t.service.review(request(payload(),t.cookie));
 expect(result.status).toBe(200);expect(result.headers.get("cache-control")).toBe("no-store");
 const text=await result.text();expect(text).not.toContain(config.apiKey);expect(text).not.toContain(config.sessionSecret);
 expect(JSON.parse(text).findings).toHaveLength(1);
});
it("rejects malformed findings from a checker instead of returning clean results",async()=>{
 const t=await setup({check:async b=>({...goodResult(b,true),findings:[{...goodResult(b,true).findings[0],shapeId:"wrong"}]})});
 expect((await t.service.review(request(payload(),t.cookie))).status).toBe(502);
});
it("limits concurrent review requests and releases a slot after failure",async()=>{
 let release:(value:ReturnType<typeof goodResult>)=>void=()=>{};
 const checker:EnglishChecker={check:async()=>new Promise(resolve=>release=resolve)};
 const t=await setup(checker,20);const first=t.service.review(request(payload(),t.cookie));const second=t.service.review(request(payload(),t.cookie));
 await new Promise(r=>setTimeout(r,5));expect((await t.service.review(request(payload(),t.cookie))).status).toBe(429);
 release(goodResult([reviewSlide(1)]));await Promise.all([first,second]);
 const again=await t.service.review(request(payload(),t.cookie));expect(again.status).toBe(504);
});
it("does not disclose untrusted error messages",async()=>{
 const t=await setup({check:async()=>{throw new Error("private text test-api-key");}});
 const response=await t.service.review(request(payload(),t.cookie));expect(response.status).toBe(502);expect(await response.text()).not.toContain("private");
});
it("keeps permanent access failures non-retryable",async()=>{
 const t=await setup({check:async()=>{throw new ReviewError("MODEL_ACCESS_FAILED");}});
 expect(await (await t.service.review(request(payload(),t.cookie))).json()).toMatchObject({error:"MODEL_ACCESS_FAILED",retryable:false});
});
