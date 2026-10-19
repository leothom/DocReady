import {createHttpChecker} from "../../src/lib/review/client";
import type {EnglishChecker} from "../../src/lib/review/types";
export type PilotOptions={origin:string;invite:string;fetcher?:typeof fetch};
export async function createPilotChecker({origin,invite,fetcher=fetch}:PilotOptions):Promise<EnglishChecker>{
 let url:URL;
 try{url=new URL(origin);}catch{throw new Error("LIVE_TEST_REQUIRES_LOCAL_SERVER");}
 if(!["http:","https:"].includes(url.protocol)||!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||url.pathname!=="/"||url.search||url.hash||url.username||url.password)throw new Error("LIVE_TEST_REQUIRES_LOCAL_SERVER");
 if(!invite)throw new Error("LOCAL_INVITE_NOT_SET");
 const base=url.origin;
 const login=await fetcher(base+"/api/invite",{method:"POST",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000),headers:{origin:base,"Content-Type":"application/json"},body:JSON.stringify({token:invite})});
 const cookie=login.headers.get("set-cookie")?.split(";")[0];
 await login.body?.cancel();
 if(!login.ok)throw new Error("LOCAL_INVITE_FAILED");
 if(!cookie?.startsWith("docready_session="))throw new Error("LOCAL_SESSION_FAILED");
 return createHttpChecker((path,init)=>{
  if(String(path)!=="/api/review")throw new Error("UNEXPECTED_LOCAL_PATH");
  const headers=new Headers(init?.headers);headers.set("origin",base);headers.set("cookie",cookie);
  return fetcher(base+"/api/review",{...init,headers});
 });
}
