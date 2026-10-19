import {it,expect,vi} from 'vitest';
import {createAccessService} from '../../src/lib/server/access';
import {createReviewService} from '../../src/lib/server/review';
import {goodResult} from '../fixtures/review-deck';
import type {Slide} from '../../src/lib/contracts';
import {ReviewError} from '../../src/lib/review/types';
const config={apiKey:'school-key',model:'deepseek-flash',origin:'https://example.test',inviteSecret:'a'.repeat(64),sessionSecret:'b'.repeat(64),inviteVersion:'1',enabled:true};
const personal='sample_personal_key_not_real_123';
function request(path:string,cookie='',key:string|null=null,mode='personal',body:unknown={}){return new Request(config.origin+path,{method:'POST',headers:{origin:config.origin,'content-type':'application/json',cookie,...(key!==null?{'x-slideready-account':mode,'x-slideready-deepseek-key':key}:{})},body:JSON.stringify(body)});}
async function login(access:ReturnType<typeof createAccessService>){return (await access.invite(request('/api/invite','',null,'',{token:config.inviteSecret}))).headers.get('set-cookie')!.split(';')[0];}
function probeResult(){return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({status:'ready',sentence:'This is a SlideReady connection test.'})}]}]});}
const payload={settings:{subject:'Business',toeflLevel:3},slides:[{slideNumber:1,elements:[{shapeId:'2',elementId:'slide-1/shape-2',text:'The company sell goods.'}]}]};
it('uses only the personal key for a probe and does not return it',async()=>{
 const fetcher=vi.fn<typeof fetch>(async(_url,init)=>{expect(new Headers(init?.headers).get('authorization')).toBe('Bearer '+personal);return probeResult();});
 const access=createAccessService({config,fetcher});const cookie=await login(access);
 const response=await access.probe(request('/api/probe',cookie,personal));expect(response.status).toBe(200);expect(await response.text()).not.toContain(personal);
});
it('never falls back after a personal probe failure',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>new Response(null,{status:401}));const access=createAccessService({config,fetcher});const cookie=await login(access);
 expect(await (await access.probe(request('/api/probe',cookie,personal))).json()).toMatchObject({error:'PERSONAL_KEY_FAILED'});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects malformed or incomplete personal selection before the provider call',async()=>{
 const fetcher=vi.fn<typeof fetch>();const access=createAccessService({config,fetcher});const cookie=await login(access);
 for(const key of ['', 'short', 'x'.repeat(513),'key with spaces 123456789'])expect((await access.probe(request('/api/probe',cookie,key))).status).toBe(400);
 const missing=request('/api/probe',cookie);missing.headers.set('x-slideready-account','personal');expect((await access.probe(missing)).status).toBe(400);
 expect(fetcher).not.toHaveBeenCalled();
});
it('requires approved access even when a personal key is supplied',async()=>{
 const fetcher=vi.fn<typeof fetch>();const access=createAccessService({config,fetcher});expect((await access.probe(request('/api/probe','',personal))).status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
});
it('selects a fresh checker per personal request while preserving the school checker',async()=>{
 const access=createAccessService({config});const cookie=await login(access);const school={check:vi.fn(async (b:Slide[])=>goodResult(b))};
 const personalChecker=vi.fn((key:string)=>({check:vi.fn(async (b:Slide[])=>{expect([personal,personal+'2']).toContain(key);return goodResult(b);})}));
 const service=createReviewService({access,checker:school,personalChecker});
 expect((await service.review(request('/api/review',cookie,personal,'personal',payload))).status).toBe(200);
 expect((await service.review(request('/api/review',cookie,personal+'2','personal',payload))).status).toBe(200);
 expect(school.check).not.toHaveBeenCalled();expect(personalChecker.mock.calls.map(c=>c[0])).toEqual([personal,personal+'2']);
 expect((await service.review(request('/api/review',cookie,null,'',payload))).status).toBe(200);expect(school.check).toHaveBeenCalledTimes(1);
});
it('maps personal review credential failures without using the school checker',async()=>{
 const access=createAccessService({config});const cookie=await login(access);const school={check:vi.fn()};
 const service=createReviewService({access,checker:school,personalChecker:()=>({check:async()=>{throw new ReviewError('MODEL_ACCESS_FAILED');}})});
 const response=await service.review(request('/api/review',cookie,personal,'personal',payload));expect(await response.json()).toMatchObject({error:'PERSONAL_KEY_FAILED',retryable:false});expect(school.check).not.toHaveBeenCalled();
});
