// Local Docker test only. Never loads .env.local or calls the AI provider.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdirSync,writeFileSync,unlinkSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {request} from "node:https";
import {setTimeout as pause} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const trial=randomUUID(),project="slideready-check-"+trial.slice(0,8);
const image=process.env.SLIDEREADY_TEST_IMAGE??"slideready:local-hk-check";
const envPath=resolve(root,"evidence","docker-check-"+trial+".env");
mkdirSync(resolve(root,"evidence"),{recursive:true});
writeFileSync(envPath,"DEEPSEEK_API_KEY=\nDEEPSEEK_MODEL=deepseek-flash\nPILOT_ENABLED=true\nPILOT_INVITE_SECRET="+"a".repeat(64)+"\nSESSION_SECRET="+"b".repeat(64)+"\nPILOT_VERSION=local-check\nPILOT_DAILY_LIMIT=10\n");
const env={...process.env,SLIDEREADY_IMAGE:image,SLIDEREADY_ENV_FILE:envPath,SITE_HOST:"localhost",PUBLIC_BIND_IP:"127.0.0.1",HTTP_PORT:"3180",HTTPS_PORT:"3443"};
const compose=["compose","--project-name",project,"--env-file","deploy/site.env.example","-f","deploy/compose.yaml"];
function docker(args,input){
 const result=spawnSync("docker",args,{cwd:root,env,input,encoding:"utf8",timeout:120000,maxBuffer:2*1024*1024});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error("Docker check failed: "+args.slice(0,2).join(" ")+"\n"+result.stderr);
 return result.stdout;
}
function call(path,method="GET",body,headers={}){
 // Self-signed LOCAL test certificate only. Production uses verified HTTPS.
 return new Promise((resolve,reject)=>{
  const req=request({hostname:"localhost",family:4,port:3443,path,method,rejectUnauthorized:false,headers:{...headers,...(body?{"Content-Type":"application/json"}:{})}},res=>{
   let text="";res.setEncoding("utf8");res.on("data",chunk=>text+=chunk);res.on("end",()=>resolve({status:res.statusCode,headers:res.headers,text}));
  });
  req.on("error",reject);req.setTimeout(10000,()=>req.destroy(new Error("Local HTTPS check timed out")));req.end(body?JSON.stringify(body):undefined);
 });
}
// Compose waits for app health, but Caddy obtains its certificate asynchronously.
// Poll only startup transport failures; do not retry any product assertion.
async function readyPage(){
 const deadline=Date.now()+20000;
 for(;;){
  try{return await call("/");}
  catch(error){
   if(!["ECONNRESET","ECONNREFUSED"].includes(error.code)||Date.now()>=deadline)throw error;
   await pause(250);
  }
 }
}
let started=false;
try{
 docker([...compose,"config","--quiet"]);
 const isolation=JSON.parse(docker(["run","--rm","--entrypoint","node",image,"-e",'const fs=require("fs");process.stdout.write(JSON.stringify({uid:process.getuid(),leaked:[".env.local",".env.production","evidence",".git",".superpowers"].filter(p=>fs.existsSync("/app/"+p))}));']));
 assert.equal(isolation.uid,1000);assert.deepEqual(isolation.leaked,[]);
 started=true;docker([...compose,"up","-d","--no-build","--wait","--wait-timeout","90"]);
 const password='LOCAL-ONLY-'+randomUUID();
 docker([...compose,'exec','-T','app','node','scripts/admin-setup.mjs'],password+'\n');
 const page=await readyPage();writeFileSync(resolve(root,"evidence","docker-check-"+trial+"-startup.log"),docker([...compose,"logs","--no-log-prefix"]));assert.equal(page.status,200);
 assert.match(page.headers["content-security-policy"],/connect-src 'self'/);assert.equal(page.headers["referrer-policy"],"no-referrer");assert.match(page.headers["cache-control"],/no-store/);
 const asset=page.text.match(/src="([^" ]*\/_next\/static\/[^" ]*\.js)"/);
 assert.ok(asset,"Standalone static JS must be served");assert.equal((await call(asset[1])).status,200);
 const denied=await call("/api/review","POST",{}, {origin:"https://localhost"});assert.equal(denied.status,401);
 const wrong=await call("/api/invite","POST",{token:"wrong"},{origin:"https://localhost"});assert.equal(wrong.status,401);
 assert.equal((await call('/api/invite','POST',{token:'a'.repeat(64)},{origin:'https://localhost'})).status,401);
 const adminHeaders={origin:'https://localhost','x-slideready-admin':'1'};
 const owner=await call('/api/admin/login','POST',{password},adminHeaders);assert.equal(owner.status,200);
 const adminCookie=owner.headers['set-cookie'][0].split(';')[0];
 const created=await call('/api/admin/invites','POST',{name:'Local test teacher',expiresAt:Date.now()+86400000,dailyLimit:1},{...adminHeaders,cookie:adminCookie});assert.equal(created.status,200);
 const named=JSON.parse(created.text),token=new URL(named.link).hash.slice('#invite='.length);
 const login=await call("/api/invite","POST",{token},{origin:"https://localhost"});assert.equal(login.status,200);
 const cookie=login.headers["set-cookie"][0];for(const flag of ["HttpOnly","Secure","SameSite=Strict"])assert.ok(cookie.includes(flag));
 const teacherHeaders={origin:'https://localhost',cookie:cookie.split(';')[0]};
 assert.equal((await call('/api/admin/invites','GET',undefined,teacherHeaders)).status,401);
 const startedReview=await call('/api/reviews','POST',{slideNumbers:[1]},teacherHeaders);assert.equal(startedReview.status,200);
 const reviewId=JSON.parse(startedReview.text).reviewId;
 const canary="SLIDEREADY_LOCAL_DEPLOYMENT_CANARY";
 const body={reviewId,requestId:randomUUID(),settings:{subject:"Business",toeflLevel:3},slides:[{slideNumber:1,elements:[{shapeId:"2",elementId:"el-0",text:canary}]}]};
 const review=await call("/api/review","POST",body,teacherHeaders);
 assert.equal(JSON.parse(review.text).error,"NOT_CONFIGURED");
 const before=await call('/api/admin/usage?days=1','GET',undefined,{cookie:adminCookie});assert.equal(before.status,200);assert.equal(JSON.parse(before.text).totals.requests,1);
 docker([...compose,'restart','app']);docker([...compose,'up','-d','--no-build','--wait','--wait-timeout','90']);await readyPage();
 const after=await call('/api/admin/usage?days=1','GET',undefined,{cookie:adminCookie});assert.equal(after.status,200);assert.equal(JSON.parse(after.text).totals.requests,1);
 const duplicate=await call('/api/review','POST',body,teacherHeaders);assert.equal(duplicate.status,409);
 const over=await call('/api/review','POST',{...body,requestId:randomUUID()},teacherHeaders);assert.equal(over.status,429);assert.equal(JSON.parse(over.text).error,'DAILY_LIMIT');
 const revoked=await call('/api/admin/invites/'+named.invite.id+'/revoke','POST',{}, {...adminHeaders,cookie:adminCookie});assert.equal(revoked.status,200);
 assert.equal((await call('/api/review','POST',{...body,requestId:randomUUID()},teacherHeaders)).status,401);
 assert.equal((await call('/api/access','POST',{email:'unlisted.sample@sendelta.com'},{origin:'https://localhost'})).status,403);
 const approved=await call('/api/admin/emails','POST',{email:'sample.teacher@sendelta.com'},{...adminHeaders,cookie:adminCookie});assert.equal(approved.status,200);
 const profile=JSON.parse(approved.text).invite;
 const entry=await call('/api/access','POST',{email:' Sample.Teacher@Sendelta.com '},{origin:'https://localhost'});assert.equal(entry.status,200);
 const emailCookie=entry.headers['set-cookie'][0].split(';')[0];
 assert.equal((await call('/api/session','GET',undefined,{cookie:emailCookie})).status,200);
 const repeated=await call('/api/admin/emails','POST',{email:'sample.teacher@sendelta.com'},{...adminHeaders,cookie:adminCookie});assert.equal(JSON.parse(repeated.text).invite.id,profile.id);
 docker([...compose,'restart','app']);docker([...compose,'up','-d','--no-build','--wait','--wait-timeout','90']);await readyPage();
 assert.equal((await call('/api/access','POST',{email:'sample.teacher@sendelta.com'},{origin:'https://localhost'})).status,200);
 await call('/api/admin/invites/'+profile.id+'/revoke','POST',{}, {...adminHeaders,cookie:adminCookie});
 assert.equal((await call('/api/access','POST',{email:'sample.teacher@sendelta.com'},{origin:'https://localhost'})).status,403);
 assert.equal((await call('/api/session','GET',undefined,{cookie:emailCookie})).status,401);
 await call('/api/admin/emails','POST',{email:'sample.teacher@sendelta.com'},{...adminHeaders,cookie:adminCookie});
 assert.equal((await call('/api/access','POST',{email:'sample.teacher@sendelta.com'},{origin:'https://localhost'})).status,403);
 await call('/api/admin/invites/'+profile.id+'/restore','POST',{}, {...adminHeaders,cookie:adminCookie});
 assert.equal((await call('/api/access','POST',{email:'sample.teacher@sendelta.com'},{origin:'https://localhost'})).status,200);
 await call('/api/admin/invites/'+profile.id+'/delete','POST',{}, {...adminHeaders,cookie:adminCookie});
 assert.equal((await call('/api/access','POST',{email:'sample.teacher@sendelta.com'},{origin:'https://localhost'})).status,403);
 docker([...compose,'stop','app']);
 docker([...compose,'run','--rm','--no-deps','-T','app','node','scripts/admin-setup.mjs'],'RESET-LOCAL-ONLY-'+randomUUID()+'\n');
 docker([...compose,'up','-d','--no-build','--wait','--wait-timeout','90']);await readyPage();
 assert.equal((await call('/api/admin/session','GET',undefined,{cookie:adminCookie})).status,401);
 const logs=docker([...compose,"logs","--no-log-prefix"]);assert.ok(!logs.includes(canary));
 const ids=docker([...compose,"ps","-q"]).trim().split(/\s+/);
 for(const id of ids){const readonly=docker(["inspect","--format","{{.HostConfig.ReadonlyRootfs}}",id]).trim();assert.equal(readonly,"true");}
 console.log("PASS: local HTTPS, named invites, admin isolation, password reset, durable usage and quotas, duplicate rejection, revocation, non-root app, read-only filesystems and no canary in logs. No AI call was made.");
}catch(error){
 if(started){try{writeFileSync(resolve(root,"evidence","docker-check-"+trial+"-failure.log"),docker([...compose,"logs","--no-log-prefix"]));}catch{/* Keep the original test failure. */}}
 throw error;
}finally{try{if(started)docker([...compose,"down","--volumes"]);}finally{unlinkSync(envPath);}}
