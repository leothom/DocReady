// Private owner access. Teacher sessions are never accepted here.
import {scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {z} from 'zod';
import {limitedText,safeJson} from './http';
import type {InviteStore} from './store';
import {normalizeSchoolEmail} from './email';

const scrypt=promisify(scryptCallback);
export async function verifyPassword(password:string,encoded:string):Promise<boolean>{
 const [salt,key]=encoded.split(':');
 if(!/^[a-f0-9]{32}$/.test(salt??'')||!/^[a-f0-9]{128}$/.test(key??''))return false;
 const result=await scrypt(password,salt,64) as Buffer;
 return timingSafeEqual(result,Buffer.from(key,'hex'));
}
const cookieName='docready_admin';
const cookie=(value:string,age:number)=>`${cookieName}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
const tokenOf=(r:Request)=>r.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)??'';
const inviteInput=z.object({name:z.string().trim().min(1).max(100),expiresAt:z.number().int().positive(),dailyLimit:z.number().int().min(1).max(10000)}).strict();

export function createAdminService(store:()=>InviteStore,origin:string,passwordHash:()=>string){
 let active=0;
 function denied(r:Request){try{return !store().validAdminSession(tokenOf(r));}catch{return true;}}
 return async function handle(r:Request,parts:string[]):Promise<Response>{
  try{
   const path=parts.join('/');
   if(r.method!=='GET'&&r.method!=='POST')return safeJson({error:'METHOD_NOT_ALLOWED'},405);
   if(r.headers.get('origin')!==origin||r.headers.get('x-docready-admin')!=='1')return safeJson({error:'ACCESS_DENIED'},403);
   if(r.method==='POST'&&!r.headers.get('content-type')?.startsWith('application/json'))return safeJson({error:'ACCESS_DENIED'},403);
   if(path!=='login'&&denied(r))return safeJson({error:'ACCESS_DENIED'},401);
   if(r.method==='GET'){
    if(path==='session')return safeJson({ok:true});
    if(path==='invites')return safeJson({invites:store().listInvites()});
    if(path==='usage'){
     const url=new URL(r.url),days=Number(url.searchParams.get('days')??30),inviteId=url.searchParams.get('inviteId')??undefined;
     if(![1,7,30,90,365].includes(days)||inviteId&&(!/^[a-zA-Z0-9-]{1,80}$/.test(inviteId)))return safeJson({error:'INVALID_REQUEST'},400);
     return safeJson(store().stats(days,inviteId));
    }
    return safeJson({error:'NOT_FOUND'},404);
   }
   if(active>=4)return safeJson({error:'TOO_MANY_REQUESTS'},429);
   active++;
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
   try{
    const input:unknown=JSON.parse(await limitedText(r.body,4096,AbortSignal.any([controller.signal,r.signal])));
    if(path==='login'){
     const parsed=z.object({password:z.string().min(1).max(256)}).strict().safeParse(input);
     if(!parsed.success)return safeJson({error:'INVALID_REQUEST'},400);
     // Caddy overwrites this header; app port is private. Never use forwarded-for.
     const address=r.headers.get('x-docready-client')??'local';
     const rateKey='admin-fail:'+createHash('sha256').update(address).digest('hex');
     if(store().checkRate(rateKey,5,15*60000))return safeJson({error:'TOO_MANY_REQUESTS'},429);
     if(!await verifyPassword(parsed.data.password,passwordHash()))return safeJson({error:'ACCESS_DENIED'},401);
     const old=tokenOf(r);if(old)store().deleteAdminSession(old);
     return safeJson({ok:true},200,{'Set-Cookie':cookie(store().createAdminSession(),28800)});
    }
    if(path==='logout'){store().deleteAdminSession(tokenOf(r));return safeJson({ok:true},200,{'Set-Cookie':cookie('',0)});}
    if(path==='emails'){
     const v=z.object({email:z.string().max(254)}).strict().parse(input),email=normalizeSchoolEmail(v.email);
     if(!email)return safeJson({error:'INVALID_REQUEST'},400);
     return safeJson({invite:store().approveEmail(email)});
    }
    if(path==='invites'){
     const v=inviteInput.parse(input);if(v.expiresAt<=Date.now()||v.expiresAt>Date.now()+366*86400000)return safeJson({error:'INVALID_REQUEST'},400);
     const result=store().createInvite(v.name,v.expiresAt,v.dailyLimit);
     return safeJson({invite:result.invite,link:`${origin}/#invite=${result.token}`});
    }
    const [,id,action]=parts;
    if(parts[0]!=='invites'||parts.length!==3||!id||!/^[a-zA-Z0-9-]{1,80}$/.test(id))return safeJson({error:'NOT_FOUND'},404);
    if(action==='update'){const v=inviteInput.parse(input);if(v.expiresAt<=Date.now()||v.expiresAt>Date.now()+366*86400000)return safeJson({error:'INVALID_REQUEST'},400);store().updateInvite(id,v);}
    else if(action==='revoke')store().revokeInvite(id);
    else if(action==='restore')store().restoreInvite(id);
    else if(action==='delete')store().deleteInvite(id);
    else if(action==='rotate'){const result=store().rotateInvite(id);return safeJson({invite:result.invite,link:`${origin}/#invite=${result.token}`});}
    else return safeJson({error:'NOT_FOUND'},404);
    return safeJson({ok:true});
   }finally{clearTimeout(timer);active--;}
  }catch(error){
   if(error instanceof z.ZodError||error instanceof SyntaxError)return safeJson({error:'INVALID_REQUEST'},400);
   return safeJson({error:'SERVICE_UNAVAILABLE'},503);
  }
 };
}
