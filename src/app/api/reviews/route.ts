import {requestPersonalKey} from '@/lib/server/request-key';
import {ReviewError} from '@/lib/review/types';
import {accessService,getStore} from '@/lib/server/runtime';
import {limitedText,safeJson} from '@/lib/server/http';
import {z} from 'zod';
import {StoreError} from '@/lib/server/store';
export const runtime='nodejs';
const schema=z.object({slideNumbers:z.array(z.number().int().min(1).max(150)).min(1).max(150)}).strict();
let active=0;
export async function POST(request:Request){
 const auth=accessService.authorize(request);if(auth instanceof Response)return auth;
 if(!auth.inviteId)return safeJson({error:'INVITE_REQUIRED'},401);
 if(active>=6)return safeJson({error:'TOO_MANY_REQUESTS'},429);
 active++;
 try{
  const payer=requestPersonalKey(request)===null?'school':'personal';
  const input=schema.parse(JSON.parse(await limitedText(request.body,4096,AbortSignal.any([request.signal,AbortSignal.timeout(5000)]))));
  if(new Set(input.slideNumbers).size!==input.slideNumbers.length)return safeJson({error:'INVALID_REQUEST'},400);
  return safeJson({reviewId:getStore().startReview(auth.inviteId,input.slideNumbers,auth.generation,payer)});
 }catch(error){
  if(error instanceof ReviewError)return safeJson({error:error.code},400);
  if(error instanceof StoreError){
   if(error.code==='QUOTA_EXCEEDED')return safeJson({error:'DAILY_LIMIT'},429);
   if(error.code==='RATE_LIMITED')return safeJson({error:'TOO_MANY_REQUESTS'},429);
   if(error.code==='INVITE_REQUIRED')return safeJson({error:'INVITE_REQUIRED'},401);
  }
  if(error instanceof z.ZodError||error instanceof SyntaxError)return safeJson({error:'INVALID_REQUEST'},400);
  return safeJson({error:'NOT_CONFIGURED'},503);
 }finally{active--;}
}
