import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {requestPersonalKey} from "./request-key";
import type {InviteStore,Invite} from './store';
import {normalizeSchoolEmail} from './email';

export type ServerConfig = {
  apiKey: string; model: string; origin: string; inviteSecret: string;
  sessionSecret: string; inviteVersion: string; enabled: boolean;
};
export type ServiceOptions = {config: ServerConfig; fetcher?: typeof fetch; now?: () => number; timeoutMs?: number; takeAllowance?: () => boolean; store?:()=>InviteStore};
const sentence="This is a DocReady connection test.";
const sessionSchema=z.object({id:z.string().regex(/^[a-f0-9]{32}$/),expiresAt:z.number().int(),inviteVersion:z.string(),inviteId:z.string().optional(),generation:z.number().int().optional()}).strict();
const probeSchema=z.object({status:z.literal("ready"),sentence:z.literal(sentence)}).strict();
const responseSchema=z.object({
  status:z.literal("completed"),
  output:z.array(z.object({type:z.string(),content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional()})),
  usage:z.object({input_tokens:z.number().int().nonnegative(),output_tokens:z.number().int().nonnegative()}).optional(),
});
function equal(a:string,b:string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(),createHash("sha256").update(b).digest());
}
function json(body:unknown,status=200,headers:Record<string,string>={}) {
  return Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}});
}
async function boundedText(body:ReadableStream<Uint8Array>|null,max:number,signal?:AbortSignal):Promise<string> {
  if(!body) return "";
  const reader=body.getReader();
  const chunks:Uint8Array[]=[];
  let size=0;
  const stop=()=>{void reader.cancel().catch(()=>{});};
  signal?.addEventListener("abort",stop,{once:true});
  try {
    while(true) {
      if(signal?.aborted) throw new Error("ABORTED");
      const {value,done}=await reader.read();
      if(done) break;
      size+=value.byteLength;
      if(size>max) {await reader.cancel();throw new Error("SIZE_LIMIT");}
      chunks.push(value);
    }
    if(signal?.aborted) throw new Error("ABORTED");
    return Buffer.concat(chunks).toString("utf8");
  } finally {signal?.removeEventListener("abort",stop);reader.releaseLock();}
}
export function createAccessService({config,fetcher=fetch,now=Date.now,timeoutMs=60000,takeAllowance=()=>true,store}:ServiceOptions) {
  const fallbackRates=new Map<string,{count:number;until:number}>();
  let activeInvites=0,activeProbes=0,activeEmails=0;
  const emailClients=new Map<string,{count:number;until:number}>();
  const probeSessions=new Map<string,number>();
  const sign=(value:string)=>createHmac("sha256",config.sessionSecret).update(value).digest("base64url");
  function limited(key:string,max:number) {
    if(store) return store().checkRate(key,max);
    const time=now();
    for(const [k,v] of fallbackRates) if(v.until<=time) fallbackRates.delete(k);
    const value=fallbackRates.get(key)??{count:0,until:time+60000};
    value.count++;
    fallbackRates.set(key,value);
    return value.count>max;
  }
  function guard(request:Request) {
    if(!config.enabled||(!store&&config.inviteSecret.length<32)||config.sessionSecret.length<32||!config.origin) return json({error:"NOT_CONFIGURED"},503);
    if(request.method!=="POST") return json({error:"METHOD_NOT_ALLOWED"},405);
    if(request.headers.get("origin")!==config.origin) return json({error:"ACCESS_DENIED"},403);
    if(!request.headers.get("content-type")?.startsWith("application/json")) return json({error:"INVALID_REQUEST"},400);
    return null;
  }
  async function body(request:Request,signal?:AbortSignal):Promise<Record<string,unknown>|Response> {
    try {
      const raw=await boundedText(request.body,2048,signal);
      const value:unknown=JSON.parse(raw);
      return typeof value==="object"&&value!==null&&!Array.isArray(value) ? value as Record<string,unknown> : json({error:"INVALID_REQUEST"},400);
    } catch(error) {
      if(signal?.aborted) return json({error:"INVALID_REQUEST"},408);
      return json({error:error instanceof Error&&error.message==="SIZE_LIMIT"?"REQUEST_TOO_LARGE":"INVALID_REQUEST"},
        error instanceof Error&&error.message==="SIZE_LIMIT"?413:400);
    }
  }
  function getSession(request:Request) {
    const cookie=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith("docready_session="))?.slice("docready_session=".length);
    if(!cookie||cookie.length>1024) return null;
    const parts=cookie.split(".");
    if(parts.length!==2||!equal(sign(parts[0]),parts[1])) return null;
    try {
      const value=sessionSchema.parse(JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8")));
      if(value.expiresAt<=now()||value.inviteVersion!==config.inviteVersion)return null;
      if(store&&(!value.inviteId||value.generation===undefined||!store().activeInvite(value.inviteId,value.generation)))return null;
      return value;
    } catch {return null;}
  }
  function sessionResponse(named?:Invite|null){
    const value=Buffer.from(JSON.stringify({id:randomBytes(16).toString('hex'),expiresAt:Math.min(now()+604800000,named?.expiresAt??Infinity),inviteVersion:config.inviteVersion,...(named?{inviteId:named.id,generation:named.generation}:{})})).toString('base64url');
    return json({ok:true},200,{'Set-Cookie':'docready_session='+value+'.'+sign(value)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800'});
  }
  return {
    async email(request:Request):Promise<Response>{
      const denied=guard(request);if(denied)return denied;
      if(!store)return json({error:'NOT_CONFIGURED'},503);
      if(activeEmails>=10){void request.body?.cancel().catch(()=>{});return json({error:'TOO_MANY_REQUESTS'},429);}
      // Caddy replaces this header; the application port is not public.
      const key=createHash('sha256').update((request.headers.get('x-docready-client')??'local').slice(0,200)).digest('hex');
      const time=now();for(const [id,bucket] of emailClients)if(bucket.until<=time)emailClients.delete(id);
      if(emailClients.size>=2048&&!emailClients.has(key)){const oldest=emailClients.keys().next().value;if(oldest!==undefined)emailClients.delete(oldest);}
      const existing=emailClients.get(key);if(existing){emailClients.delete(key);existing.count++;existing.until=time+60000;emailClients.set(key,existing);}else{emailClients.set(key,{count:1,until:time+60000});}
      const bucket=emailClients.get(key)!;
      if(bucket.count>60){void request.body?.cancel().catch(()=>{});return json({error:'TOO_MANY_REQUESTS'},429,{'Retry-After':'60'});}
      activeEmails++;
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
      try{
        const input=await body(request,AbortSignal.any([controller.signal,request.signal]));if(input instanceof Response)return input;
        const parsed=z.object({email:z.string().trim().min(3).max(254).email()}).strict().safeParse(input);
        if(!parsed.success)return json({error:'INVALID_REQUEST'},400);
        const normalized=normalizeSchoolEmail(parsed.data.email);
        const named=normalized?store().emailInvite(normalized):null;
        if(!named)return json({error:'EMAIL_NOT_APPROVED'},403);
        if(limited('email-valid',120))return json({error:'TOO_MANY_REQUESTS'},429,{'Retry-After':'60'});
        return sessionResponse(named);
      }catch{return json({error:'NOT_CONFIGURED'},503);}finally{clearTimeout(timer);activeEmails--;}
    },
    status(request:Request):Response {
      if(!config.enabled)return json({error:'NOT_CONFIGURED'},503);
      return getSession(request)?json({ok:true}):json({error:'INVITE_REQUIRED'},401);
    },
    authorize(request:Request):{sessionId:string;inviteId?:string;generation?:number}|Response {
      const denied=guard(request);if(denied)return denied;
      const session=getSession(request);return session?{sessionId:session.id,inviteId:session.inviteId,generation:session.generation}:json({error:"INVITE_REQUIRED"},401);
    },
    async invite(request:Request):Promise<Response> {
      const denied=guard(request); if(denied) return denied;
      if(activeInvites>=20) {
        void request.body?.cancel().catch(()=>{});
        return json({error:"TOO_MANY_REQUESTS"},429,{"Retry-After":"1"});
      }
      activeInvites++;
      // Failed attempts cannot spend the valid-invite allowance. Only fixed keys
      // are stored, so random tokens cannot grow the rate map.
      const failed=(response:Response)=>limited("invite-invalid",20)?json({error:"TOO_MANY_REQUESTS"},429,{"Retry-After":"60"}):response;
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      try {
        const input=await body(request,controller.signal); if(input instanceof Response) return failed(input);
        if(Object.keys(input).some(k=>k!=="token")) return failed(json({error:"INVALID_REQUEST"},400));
        if(typeof input.token!=="string")return failed(json({error:'INVITE_REQUIRED'},401));
        const named=store?store().redeem(input.token):null;
        if(store?!named:!equal(input.token,config.inviteSecret)) return failed(json({error:"INVITE_REQUIRED"},401));
        if(limited("invite-valid",20)) return json({error:"TOO_MANY_REQUESTS"},429,{"Retry-After":"60"});
        return sessionResponse(named);
      } catch {return json({error:'NOT_CONFIGURED'},503);} finally {clearTimeout(timer);activeInvites--;}
    },
    async probe(request:Request):Promise<Response> {
      const denied=guard(request); if(denied) return denied;
      const session=getSession(request); if(!session) return json({error:"INVITE_REQUIRED"},401);
      // Admit before reading: a stalled body must not bypass request limits.
      if(activeProbes>=6||(probeSessions.get(session.id)??0)>=2||limited("probe-global",30)||limited("probe-"+session.id,6)) {
        void request.body?.cancel().catch(()=>{});
        return json({error:"TOO_MANY_REQUESTS"},429,{"Retry-After":"60"});
      }
      activeProbes++;probeSessions.set(session.id,(probeSessions.get(session.id)??0)+1);
      const started=now(),controller=new AbortController();
      const signal=AbortSignal.any([controller.signal,request.signal]);
      const timeout=setTimeout(()=>controller.abort(),timeoutMs);
      let ledgerId:string|undefined;
      try {
        const input=await body(request,signal);
        if(request.signal.aborted) return json({error:"CANCELLED"},499);
        if(input instanceof Response) return input;
        if(Object.keys(input).length) return json({error:"INVALID_REQUEST"},400);
        let personalKey:string|null;
        try{personalKey=requestPersonalKey(request);}catch{return json({error:"PERSONAL_KEY_INVALID"},400);}
        const apiKey=personalKey??config.apiKey;
        if(!apiKey||!["deepseek-flash","deepseek-v4-pro"].includes(config.model)) return json({error:"NOT_CONFIGURED"},503);
        if(store){
          if(!session.inviteId)return json({error:'INVITE_REQUIRED'},401);
          const id=randomUUID();
          try{store().reserve({inviteId:session.inviteId,generation:session.generation,reviewId:null,requestId:id,slideNumbers:[],kind:'probe',payer:personalKey===null?'school':'personal'});ledgerId=id;}
          catch{return json({error:'TOO_MANY_REQUESTS'},429);}
        }else if(personalKey===null&&!takeAllowance()) return json({error:"TOO_MANY_REQUESTS"},429,{"Retry-After":"60"});
        const result=await fetcher("https://api.deepseek.com/responses",{
          method:"POST",redirect:"error",cache:"no-store",
          signal,
          headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},
          body:JSON.stringify({
            model:config.model,reasoning:{effort:"none"},stream:false,max_output_tokens:256,
            instructions:'Return a JSON object with status "ready" and the exact sentence supplied. No other fields.',
            input:sentence,
            text:{format:{type:"json_schema",name:"connection_check",schema:{
              type:"object",additionalProperties:false,properties:{status:{type:"string",enum:["ready"]},sentence:{type:"string",enum:[sentence]}},
              required:["status","sentence"],
            }}},
          }),
        });
        if(!result.ok) {
          await result.body?.cancel();
          return json({error:result.status===401||result.status===402||result.status===403?(personalKey!==null?"PERSONAL_KEY_FAILED":"MODEL_ACCESS_FAILED"):"MODEL_UNAVAILABLE"},502);
        }
        const parsed=responseSchema.safeParse(JSON.parse(await boundedText(result.body,65536,signal)));
        if(!parsed.success) return json({error:"INVALID_MODEL_OUTPUT"},502);
        const output=parsed.data.output.filter(x=>x.type==="message").flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join("");
        if(!probeSchema.safeParse(JSON.parse(output)).success) return json({error:"INVALID_MODEL_OUTPUT"},502);
        if(ledgerId){store!().finish(ledgerId,'success',{usage:{inputTokens:parsed.data.usage?.input_tokens??null,outputTokens:parsed.data.usage?.output_tokens??null,cachedInputTokens:null},costUsd:null,model:config.model});ledgerId=undefined;}
        return json({ok:true,model:config.model,elapsedMs:Math.max(0,now()-started),
          inputTokens:parsed.data.usage?.input_tokens??null,outputTokens:parsed.data.usage?.output_tokens??null});
      } catch(error) {
        if(controller.signal.aborted) return json({error:"MODEL_TIMEOUT"},504);
        if(request.signal.aborted) return json({error:"CANCELLED"},499);
        return json({error:error instanceof SyntaxError||error instanceof Error&&error.message==="SIZE_LIMIT"?"INVALID_MODEL_OUTPUT":"MODEL_UNAVAILABLE"},502);
      } finally {
        if(ledgerId){try{store!().finish(ledgerId,'failed',undefined,'MODEL_UNAVAILABLE');}catch{}}
        clearTimeout(timeout);activeProbes--;
        const remaining=(probeSessions.get(session.id)??1)-1;
        if(remaining)probeSessions.set(session.id,remaining);else probeSessions.delete(session.id);
      }
    },
  };
}
