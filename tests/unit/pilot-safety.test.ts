import {it,expect,vi} from "vitest";
import {createDailyAllowance} from "../../src/lib/server/allowance";
import {createAccessService} from "../../src/lib/server/access";
import {createReviewService} from "../../src/lib/server/review";
import {goodResult} from "../fixtures/review-deck";
const config={apiKey:"invented-test-key",model:"deepseek-flash",origin:"http://localhost:3100",inviteSecret:"a".repeat(64),sessionSecret:"b".repeat(64),inviteVersion:"1",enabled:true};
function request(path:string,body:unknown={},cookie=""){return new Request(config.origin+path,{method:"POST",headers:{origin:config.origin,"content-type":"application/json",cookie},body:JSON.stringify(body)});}
async function login(access:ReturnType<typeof createAccessService>){const r=await access.invite(request("/api/invite",{token:config.inviteSecret}));return r.headers.get("set-cookie")!.split(";")[0];}
it("uses one UTC daily allowance for all sessions and resets at midnight",()=>{
 let now=Date.UTC(2026,9,5,23,59);const take=createDailyAllowance(2,()=>now);
 expect(take()).toBe(true);expect(take()).toBe(true);expect(take()).toBe(false);
 now=Date.UTC(2026,9,6);expect(take()).toBe(true);
});
it.each([0,-1,NaN,Infinity,1.5,10001])("invalid allowance %s fails closed",limit=>{
 expect(createDailyAllowance(limit)()).toBe(false);
});
it("shares the allowance between probe and review and denies extra paid calls",async()=>{
 const take=createDailyAllowance(1),fetcher=vi.fn<typeof fetch>(async()=>Response.json({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify({status:"ready",sentence:"This is a SlideReady connection test."})}]}]}));
 const access=createAccessService({config,fetcher,takeAllowance:take}),cookie=await login(access);
 expect((await access.probe(request("/api/probe",{},cookie))).status).toBe(200);
 const check=vi.fn(async (batch:Parameters<typeof goodResult>[0])=>goodResult(batch));
 const service=createReviewService({access,checker:{check},takeAllowance:take});
 const input={settings:{subject:"Business",toeflLevel:3},slides:[{slideNumber:1,elements:[{shapeId:"2",elementId:"e1",text:"Invented private lesson."}]}]};
 const denied=await service.review(request("/api/review",input,cookie));
 expect(denied.status).toBe(429);expect(await denied.json()).toMatchObject({error:"TOO_MANY_REQUESTS",retryable:false});
 expect(check).not.toHaveBeenCalled();expect(fetcher).toHaveBeenCalledTimes(1);
});
it("ends a stalled invite body and cancels the stream",async()=>{
 let cancelled=false;
 const stream=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}});
 const access=createAccessService({config,timeoutMs:20});
 const stalled=new Request(config.origin+"/api/invite",{method:"POST",headers:{origin:config.origin,"content-type":"application/json"},body:stream,duplex:"half"} as RequestInit);
 const result=await access.invite(stalled);
 expect(result.status).toBe(408);expect(await result.json()).toEqual({error:"INVALID_REQUEST"});expect(cancelled).toBe(true);
});
it("ends a stalled provider response body without returning its content",async()=>{
 let cancelled=false;
 const fetcher:typeof fetch=async()=>new Response(new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode("PRIVATE_PROVIDER_BODY"));},cancel(){cancelled=true;}}));
 const access=createAccessService({config,fetcher,timeoutMs:20}),cookie=await login(access);
 const result=await access.probe(request("/api/probe",{},cookie));
 expect(result.status).toBe(504);expect(await result.text()).not.toContain("PRIVATE_PROVIDER_BODY");expect(cancelled).toBe(true);
});
