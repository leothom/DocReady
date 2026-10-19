import {it,expect,vi} from "vitest";
import {createDeepSeekChecker} from "../../src/lib/server/deepseek";
import {ReviewError} from "../../src/lib/review/types";
import {reviewSlide,goodResult} from "../fixtures/review-deck";
const batch=[reviewSlide(1)],settings={subject:"Business",toeflLevel:3} as const;
function response(status="completed",text=JSON.stringify({findings:goodResult(batch,true).findings}),usage:unknown={input_tokens:100,output_tokens:20,input_tokens_details:{cached_tokens:10}}){return Response.json({status,model:"deepseek-flash",output:[{type:"message",role:"assistant",content:[{type:"output_text",text}]}],usage});}
it("sends text with strict schema and no file, tools or state",async()=>{
 const fetcher=vi.fn<typeof fetch>(async(url,init)=>{
  expect(url).toBe("https://api.deepseek.com/responses");expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
  const body=JSON.parse(String(init?.body));expect(body.model).toBe("deepseek-flash");expect(body.max_output_tokens).toBe(8192);expect(body.reasoning.effort).toBe("none");expect(body.text.format.type).toBe("json_schema");
  expect(body.text.format.schema.additionalProperties).toBe(false);expect(body.tools).toBeUndefined();expect(body.previous_response_id).toBeUndefined();expect(body.input).not.toContain("shapeName");
  return response();
 });
 const checker=createDeepSeekChecker({apiKey:"test-key",model:"deepseek-flash",fetcher,priceTier:"off_peak"});
 const result=await checker.check(batch,settings,new AbortController().signal);
 expect(result.findings).toHaveLength(1);expect(result.usage).toEqual({inputTokens:100,outputTokens:20,cachedInputTokens:10});
 expect(result.costUsd).toBeCloseTo((10*.003+90*.15+20*.6)/1e6);
});
it("keeps cost unknown when the actual price tier is not set",async()=>{
 const result=await createDeepSeekChecker({apiKey:"test-key",model:"deepseek-flash",fetcher:async()=>response()}).check(batch,settings,new AbortController().signal);
 expect(result.costUsd).toBeNull();
});
it.each([["incomplete",JSON.stringify({findings:[]})],["completed","invalid json"],["completed",JSON.stringify({findings:[{...goodResult(batch,true).findings[0],originalText:"forged"}]})]])("rejects %s or malformed output and retains known usage",async(status,text)=>{
 const checker=createDeepSeekChecker({apiKey:"test-key",model:"deepseek-flash",fetcher:async()=>response(status,text)});
 try{await checker.check(batch,settings,new AbortController().signal);expect.fail("should reject");}catch(error){expect(error).toBeInstanceOf(ReviewError);expect((error as ReviewError).retryable).toBe(true);expect((error as ReviewError).metrics?.usage.inputTokens).toBe(100);}
});
it.each([[400,false],[401,false],[402,false],[403,false],[429,true],[500,true],[503,true]])("sanitizes provider HTTP %s",async(status,retryable)=>{
 const checker=createDeepSeekChecker({apiKey:"test-key",model:"deepseek-flash",fetcher:async()=>new Response("private provider body test-key",{status,headers:{"Retry-After":"120"}})});
 try{await checker.check(batch,settings,new AbortController().signal);expect.fail("should reject");}catch(error){expect(error).toBeInstanceOf(ReviewError);expect((error as ReviewError).retryable).toBe(retryable);expect(String(error)).not.toContain("test-key");expect(String(error)).not.toContain("private");}
});
it("aborts a timed-out provider call",async()=>{
 const fetcher:typeof fetch=async(_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener("abort",()=>reject(new Error("private detail"))));
 await expect(createDeepSeekChecker({apiKey:"test-key",model:"deepseek-flash",fetcher,timeoutMs:5}).check(batch,settings,new AbortController().signal)).rejects.toMatchObject({code:"MODEL_TIMEOUT",retryable:true});
});
it("rejects a caller-selected model before a network request",async()=>{
 const fetcher=vi.fn<typeof fetch>();await expect(createDeepSeekChecker({apiKey:"test-key",model:"unapproved",fetcher}).check(batch,settings,new AbortController().signal)).rejects.toMatchObject({code:"NOT_CONFIGURED",retryable:false});expect(fetcher).not.toHaveBeenCalled();
});

it("uses temperature zero while retaining strict mode and output limits",async()=>{
 const fetcher:typeof fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  expect(body.temperature).toBe(0);expect(body.reasoning.effort).toBe("none");
  expect(body.max_output_tokens).toBe(8192);expect(body.text.format.type).toBe("json_schema");
  return response();
 };
 await createDeepSeekChecker({apiKey:"invented",model:"deepseek-flash",fetcher}).check(batch,settings,new AbortController().signal);
});
