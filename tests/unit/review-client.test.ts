import {it,expect,vi} from "vitest";
import {createHttpChecker} from "../../src/lib/review/client";
import {ReviewError} from "../../src/lib/review/types";
import {reviewSlide,goodResult} from "../fixtures/review-deck";
const batch=[reviewSlide(1)],settings={subject:"Business",toeflLevel:3} as const;
it("sends only text IDs and settings to the same-origin route",async()=>{
 const fetcher=vi.fn<typeof fetch>(async(url,init)=>{
  expect(url).toBe("/api/review");const payload=JSON.parse(String(init?.body));
  expect(Object.keys(payload)).toEqual(["settings","slides"]);expect(payload.slides[0].elements[0]).toEqual({shapeId:"2",elementId:"slide-1/shape-2",text:"The company sell goods."});
  expect(payload.slides[0].elements[0].shapeName).toBeUndefined();expect(init?.cache).toBe("no-store");
  return Response.json(goodResult(batch,true));
 });
 const result=await createHttpChecker(fetcher).check(batch,settings,new AbortController().signal);
 expect(result.findings[0].explanation["zh-Hans"]).toBeTruthy();
});
it("rejects forged, malformed and extra-field results",async()=>{
 for(const response of [Response.json({...goodResult(batch),extra:"value"}),Response.json({...goodResult(batch,true),findings:[{...goodResult(batch,true).findings[0],originalText:"forged"}]}),new Response("not JSON",{status:200})]){
  await expect(createHttpChecker(async()=>response).check(batch,settings,new AbortController().signal)).rejects.toMatchObject({code:"INVALID_MODEL_OUTPUT",retryable:true});
 }
});
it("keeps expired access permanent but retries rate limits",async()=>{
 for(const [status,code,retryable] of [[401,"INVITE_REQUIRED",false],[429,"TOO_MANY_REQUESTS",true]] as const){
  await expect(createHttpChecker(async()=>Response.json({error:code,retryable},{status})).check(batch,settings,new AbortController().signal)).rejects.toMatchObject({code,retryable});
 }
});
it("rejects unknown errors without leaking raw text",async()=>{
 const checker=createHttpChecker(async()=>new Response("private error body",{status:500}));
 try{await checker.check(batch,settings,new AbortController().signal);expect.fail("should reject");}catch(error){expect(error).toBeInstanceOf(ReviewError);expect(String(error)).not.toContain("private");}
});
it("aborted requests stay cancelled",async()=>{
 const c=new AbortController();c.abort();
 const fetcher=vi.fn<typeof fetch>();await expect(createHttpChecker(fetcher).check(batch,settings,c.signal)).rejects.toMatchObject({code:"CANCELLED",retryable:false});expect(fetcher).not.toHaveBeenCalled();
});
