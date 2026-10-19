import {describe,it,expect,vi} from "vitest";
import {createAccessService, type ServerConfig} from "../../src/lib/server/access";

const config: ServerConfig = {
  apiKey:"test-permanent-secret", model:"deepseek-flash", origin:"http://localhost:3000",
  inviteSecret:"a".repeat(64),sessionSecret:"b".repeat(64),inviteVersion:"1",enabled:true,
};
function request(path: string, body: unknown = {}, cookie = "", origin = config.origin) {
  return new Request(config.origin+path,{method:"POST",headers:{
    origin,"content-type":"application/json",...(cookie ? {cookie}:{}),
  },body:JSON.stringify(body)});
}
function upstream() {
  return Response.json({id:"synthetic-response",status:"completed",model:"deepseek-flash",
    output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify({
      status:"ready",sentence:"This is a SlideReady connection test.",
    })}]}],usage:{input_tokens:41,output_tokens:22}});
}
async function login(service: ReturnType<typeof createAccessService>) {
  const response=await service.invite(request("/api/invite",{token:config.inviteSecret}));
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie")!.split(";")[0];
}
describe("private access and server-only model call",()=>{
  it("rejects a missing invite",async()=>{
    const service=createAccessService({config});
    expect((await service.invite(request("/api/invite"))).status).toBe(401);
  });
  it("rejects another origin before authentication",async()=>{
    const service=createAccessService({config});
    expect((await service.invite(request("/api/invite",{token:config.inviteSecret},"","https://other.example"))).status).toBe(403);
  });
  it("rejects oversized and unexpected input",async()=>{
    const service=createAccessService({config});
    expect((await service.invite(request("/api/invite",{token:"x".repeat(3000)}))).status).toBe(413);
    expect((await service.invite(request("/api/invite",{token:config.inviteSecret,slideText:"private"}))).status).toBe(400);
  });
  it("sets a protected session cookie with no cache",async()=>{
    const service=createAccessService({config});
    const result=await service.invite(request("/api/invite",{token:config.inviteSecret}));
    expect(result.status).toBe(200);
    expect(result.headers.get("set-cookie")).toContain("HttpOnly");
    expect(result.headers.get("set-cookie")).toContain("Secure");
    expect(result.headers.get("set-cookie")).toContain("SameSite=Strict");
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(await result.text()).not.toContain(config.sessionSecret);
  });
  it("rejects missing and tampered sessions without contacting the provider",async()=>{
    const fetcher=vi.fn<typeof fetch>();
    const service=createAccessService({config,fetcher});
    expect((await service.probe(request("/api/probe"))).status).toBe(401);
    const cookie=await login(service);
    expect((await service.probe(request("/api/probe",{},cookie+"x"))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects expired and rotated sessions",async()=>{
    let now=1_800_000_000_000;
    const service=createAccessService({config,now:()=>now});
    const cookie=await login(service);
    now+=7*24*60*60*1000+1;
    expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(401);
    const rotated=createAccessService({config:{...config,inviteVersion:"2"}});
    expect((await rotated.probe(request("/api/probe",{},cookie))).status).toBe(401);
  });
  it("fails closed when the pilot is disabled or secrets are missing",async()=>{
    const disabled=createAccessService({config:{...config,enabled:false}});
    expect((await disabled.invite(request("/api/invite",{token:config.inviteSecret}))).status).toBe(503);
    const missing=createAccessService({config:{...config,sessionSecret:""}});
    expect((await missing.invite(request("/api/invite",{token:config.inviteSecret}))).status).toBe(503);
  });
  it("sends the permanent key only upstream and returns validated metadata",async()=>{
    const fetcher=vi.fn<typeof fetch>(async(input,init)=>{
      expect(input).toBe("https://api.deepseek.com/responses");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-permanent-secret");
      const body=JSON.parse(String(init?.body));
      expect(body.model).toBe("deepseek-flash");
      expect(body.reasoning).toEqual({effort:"none"});
      expect(body.text.format.type).toBe("json_schema");
      expect(body.max_output_tokens).toBe(256);
      expect(body.input).toBe("This is a SlideReady connection test.");
      return upstream();
    });
    const service=createAccessService({config,fetcher});
    const cookie=await login(service);
    const result=await service.probe(request("/api/probe",{},cookie));
    expect(result.status).toBe(200);
    const text=await result.text();
    expect(text).not.toContain(config.apiKey);
    expect(text).not.toContain("synthetic-response");
    expect(JSON.parse(text)).toMatchObject({ok:true,model:"deepseek-flash",inputTokens:41,outputTokens:22});
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not accept slide text or a caller-selected endpoint at the probe",async()=>{
    const fetcher=vi.fn<typeof fetch>();
    const service=createAccessService({config,fetcher});
    const cookie=await login(service);
    expect((await service.probe(request("/api/probe",{text:"private lesson"},cookie))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not make a request when the API key is missing",async()=>{
    const fetcher=vi.fn<typeof fetch>();
    const service=createAccessService({config:{...config,apiKey:""},fetcher});
    const cookie=await login(service);
    const result=await service.probe(request("/api/probe",{},cookie));
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({error:"NOT_CONFIGURED"});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401,402,429,500])("does not relay provider error bodies (%i)",async(status)=>{
    const fetcher=vi.fn<typeof fetch>(async()=>new Response("SECRET AND PRIVATE CONTENT",{status}));
    const service=createAccessService({config,fetcher});
    const cookie=await login(service);
    const result=await service.probe(request("/api/probe",{},cookie));
    expect(result.status).toBe(502);
    expect(await result.text()).not.toContain("SECRET");
  });
  it.each([
    {status:"incomplete",output:[]},
    {status:"completed",output:[{type:"message",content:[{type:"output_text",text:'{"status":"ready","sentence":"wrong"}'}]}]},
    {status:"completed",output:[{type:"message",content:[{type:"output_text",text:'not json'}]}]},
  ])("rejects incomplete or invalid model output",async(body)=>{
    const service=createAccessService({config,fetcher:async()=>Response.json(body)});
    const cookie=await login(service);
    const result=await service.probe(request("/api/probe",{},cookie));
    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({error:"INVALID_MODEL_OUTPUT"});
  });
  it("ends a timed-out model request without returning an exception",async()=>{
    const fetcher: typeof fetch=async(_input,init)=>new Promise((_resolve,reject)=>{
      init!.signal!.addEventListener("abort",()=>reject(new DOMException("secret","AbortError")),{once:true});
    });
    const service=createAccessService({config,fetcher,timeoutMs:10});
    const cookie=await login(service);
    const result=await service.probe(request("/api/probe",{},cookie));
    expect(result.status).toBe(504);
    expect(await result.json()).toEqual({error:"MODEL_TIMEOUT"});
  });
  it("limits requests and recovers after the window",async()=>{
    let now=1_800_000_000_000;
    const fetcher=vi.fn<typeof fetch>(async()=>upstream());
    const service=createAccessService({config,fetcher,now:()=>now});
    const cookie=await login(service);
    for(let i=0;i<6;i++) expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(200);
    expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(6);
    now+=60001;
    expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(200);
  });
});

describe("invite admission isolation",()=>{
 it("keeps valid invites available after invalid and malformed attempts",async()=>{
  const service=createAccessService({config});
  for(let i=0;i<20;i++)expect((await service.invite(request("/api/invite",{token:"wrong-"+i}))).status).toBe(401);
  expect((await service.invite(request("/api/invite",{token:"wrong"}))).status).toBe(429);
  expect((await service.invite(request("/api/invite",{token:config.inviteSecret}))).status).toBe(200);
  expect((await service.invite(request("/api/invite",{token:config.inviteSecret,extra:true}))).status).toBe(429);
  expect((await service.invite(request("/api/invite",{token:config.inviteSecret}))).status).toBe(200);
 });
 it("retains a separate limit on valid invites and recovers after the window",async()=>{
  let now=1800000000000;const service=createAccessService({config,now:()=>now});
  for(let i=0;i<20;i++)expect((await service.invite(request("/api/invite",{token:config.inviteSecret}))).status).toBe(200);
  expect((await service.invite(request("/api/invite",{token:config.inviteSecret}))).status).toBe(429);
  now+=60001;
  expect((await service.invite(request("/api/invite",{token:config.inviteSecret}))).status).toBe(200);
 });
});

function unfinishedRequest(cookie:string,signal?:AbortSignal,path="/api/probe"){
 let cancelled=false;let streamController:ReadableStreamDefaultController<Uint8Array>;
 const stream=new ReadableStream<Uint8Array>({start(controller){streamController=controller;},cancel(){cancelled=true;}});
 const input=new Request(config.origin+path,{method:"POST",headers:{origin:config.origin,"content-type":"application/json",cookie},body:stream,signal,duplex:"half"} as RequestInit & {duplex:string});
 return {input,wasCancelled:()=>cancelled,close:()=>{if(!cancelled)streamController!.close();}};
}
describe("probe request lifetime",()=>{
 it("times out and cancels an unfinished request body without a provider call",async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>upstream());
  const service=createAccessService({config,fetcher,timeoutMs:10});const cookie=await login(service);
  const stream=unfinishedRequest(cookie),pending=service.probe(stream.input);
  const result=await Promise.race([pending,new Promise<null>(resolve=>setTimeout(()=>resolve(null),150))]);
  if(!result){stream.close();await pending;}
  expect(result?.status).toBe(408);expect(stream.wasCancelled()).toBe(true);expect(fetcher).not.toHaveBeenCalled();
 });
 it("cancels body reading when the client disconnects",async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>upstream()),abort=new AbortController();
  const service=createAccessService({config,fetcher,timeoutMs:1000});const cookie=await login(service);
  const stream=unfinishedRequest(cookie,abort.signal),pending=service.probe(stream.input);abort.abort();
  const result=await Promise.race([pending,new Promise<null>(resolve=>setTimeout(()=>resolve(null),150))]);
  if(!result){stream.close();await pending;}
  expect(result?.status).toBe(499);expect(stream.wasCancelled()).toBe(true);expect(fetcher).not.toHaveBeenCalled();
 });
 it("limits concurrent body reads and releases slots after timeout",async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>upstream());
  const service=createAccessService({config,fetcher,timeoutMs:30});const cookie=await login(service);
  const streams=[unfinishedRequest(cookie),unfinishedRequest(cookie)];const pending=streams.map(stream=>service.probe(stream.input));
  const denied=await service.probe(request("/api/probe",{},cookie));
  const ended=await Promise.race([Promise.all(pending),new Promise<null>(resolve=>setTimeout(()=>resolve(null),150))]);
  if(!ended){for(const stream of streams)stream.close();await Promise.all(pending);}
  expect(denied.status).toBe(429);expect(ended?.map(result=>result.status)).toEqual([408,408]);
  expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(200);
 });
 it("checks rate admission before reading an unfinished body",async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>upstream());const service=createAccessService({config,fetcher});const cookie=await login(service);
  for(let i=0;i<6;i++)expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(200);
  const stream=unfinishedRequest(cookie),pending=service.probe(stream.input);
  const result=await Promise.race([pending,new Promise<null>(resolve=>setTimeout(()=>resolve(null),150))]);
  if(!result){stream.close();await pending;}
  expect(result?.status).toBe(429);expect(fetcher).toHaveBeenCalledTimes(6);
 });
});

it("bounds concurrent unauthenticated invite bodies and frees slots after timeout",async()=>{
 const service=createAccessService({config,timeoutMs:10});
 const streams=Array.from({length:20},()=>unfinishedRequest("",undefined,"/api/invite"));
 const pending=streams.map(stream=>service.invite(stream.input));
 const denied=await service.invite(request("/api/invite",{token:config.inviteSecret}));
 const ended=await Promise.race([Promise.all(pending),new Promise<null>(resolve=>setTimeout(()=>resolve(null),150))]);
 if(!ended){for(const stream of streams)stream.close();await Promise.all(pending);}
 expect(denied.status).toBe(429);expect(ended?.every(response=>response.status===408)).toBe(true);
 expect((await service.invite(request("/api/invite",{token:config.inviteSecret}))).status).toBe(200);
});
it("bounds probe concurrency across different sessions",async()=>{
 const service=createAccessService({config,fetcher:async()=>upstream(),timeoutMs:30});
 const cookies=await Promise.all(Array.from({length:4},()=>login(service)));
 const streams=cookies.slice(0,3).flatMap(cookie=>[unfinishedRequest(cookie),unfinishedRequest(cookie)]);
 const pending=streams.map(stream=>service.probe(stream.input));
 const denied=await service.probe(request("/api/probe",{},cookies[3]));
 await Promise.all(pending);
 expect(denied.status).toBe(429);expect((await service.probe(request("/api/probe",{},cookies[3]))).status).toBe(200);
});
it("frees probe admission after provider failures",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("private",{status:500})).mockResolvedValueOnce(new Response("private",{status:500})).mockImplementation(async()=>upstream());
 const service=createAccessService({config,fetcher});const cookie=await login(service);
 expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(502);
 expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(502);
 expect((await service.probe(request("/api/probe",{},cookie))).status).toBe(200);
});
