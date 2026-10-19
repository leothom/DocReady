import {it,expect} from 'vitest';
import {InviteStore} from '../../src/lib/server/store';
it('personal requests bypass exhausted school limits and never consume school credit',()=>{
 const s=new InviteStore(':memory:',1);try{
 const {invite:i}=s.createInvite('Test',Date.now()+86400000,1);
 const reserve=(id:string,payer:'school'|'personal')=>s.reserve({inviteId:i.id,reviewId:null,requestId:id,slideNumbers:[],kind:'probe',payer});
 reserve('personal1','personal');reserve('school1','school');reserve('personal2','personal');
 expect(()=>reserve('school2','school')).toThrow('QUOTA_EXCEEDED');
 const review=s.startReview(i.id,[1],i.generation,'personal');
 expect(()=>s.reserve({inviteId:i.id,reviewId:review,requestId:'wrong',slideNumbers:[1],kind:'review',payer:'school'})).toThrow('INVALID_REQUEST');
 s.reserve({inviteId:i.id,reviewId:review,requestId:'personal3',slideNumbers:[1],kind:'review',payer:'personal'});
 s.finish('personal3','success',{usage:{inputTokens:10,outputTokens:2,cachedInputTokens:0},costUsd:.002,model:'deepseek-flash'});
 expect(s.stats(1).totals).toMatchObject({requests:4,personalRequests:3,schoolRequests:1,personalCostUsd:.002,schoolCostUsd:0});
 s.revokeInvite(i.id);expect(()=>reserve('revoked','personal')).toThrow('INVITE_REQUIRED');
 }finally{s.close();}
});
it('personal review admission keeps the unused-review rate limit',()=>{
 const s=new InviteStore(':memory:',1);try{const {invite:i}=s.createInvite('Test',Date.now()+86400000,1);for(let n=0;n<20;n++)s.startReview(i.id,[1],i.generation,'personal');expect(()=>s.startReview(i.id,[1],i.generation,'personal')).toThrow('RATE_LIMITED');}finally{s.close();}
});
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
it('migrates old usage without guessing payer or losing school quota',()=>{
 const dir=mkdtempSync(join(tmpdir(),'payer-migration-')),path=join(dir,'usage.sqlite');let s:InviteStore|undefined;
 try{
 s=new InviteStore(path,1);const {invite:i}=s.createInvite('Test',Date.now()+86400000,1);
 s.reserve({inviteId:i.id,reviewId:null,requestId:'old',slideNumbers:[],kind:'probe'});s.close();s=undefined;
 const db=new DatabaseSync(path);try{db.exec("ALTER TABLE requests DROP COLUMN payer; ALTER TABLE reviews DROP COLUMN payer; UPDATE daily SET data=json_remove(data,'$.schoolRequests','$.personalRequests','$.schoolCostUsd','$.personalCostUsd'); PRAGMA user_version=2;");}finally{db.close();}
 s=new InviteStore(path,1);expect(s.stats(1).totals).toMatchObject({requests:1,schoolRequests:0,personalRequests:0,schoolCostUsd:0,personalCostUsd:0});
 expect(()=>s!.startReview(i.id,[1])).toThrow('QUOTA_EXCEEDED');
 expect(s.startReview(i.id,[1],i.generation,'personal')).toEqual(expect.any(String));
 s.finish('old','success',{usage:{inputTokens:1,outputTokens:1,cachedInputTokens:0},costUsd:.001,model:'deepseek-flash'});
 expect(s.stats(1).totals).toMatchObject({costUsd:.001,schoolCostUsd:0,personalCostUsd:0});
 s.close();s=new InviteStore(path,1);expect(s.stats(1).totals.requests).toBe(1);
 }finally{s?.close();rmSync(dir,{recursive:true,force:true});}
});
import {vi} from 'vitest';
import {createAccessService} from '../../src/lib/server/access';
import {createReviewService} from '../../src/lib/server/review';
import {goodResult} from '../fixtures/review-deck';
it('routes personal probe and review past exhausted school quota without school dispatch',async()=>{
 const store=new InviteStore(':memory:',1);try{
 const config={apiKey:'school-key',model:'deepseek-flash',origin:'https://example.test',inviteSecret:'',sessionSecret:'s'.repeat(64),inviteVersion:'1',enabled:true};
 const fetcher=vi.fn<typeof fetch>(async()=>new Response(null,{status:401}));
 const access=createAccessService({config,store:()=>store,fetcher});const {invite:i,token}=store.createInvite('Test',Date.now()+86400000,1);
 const request=(path:string,body:unknown,cookie='',personal=false)=>new Request(config.origin+path,{method:'POST',headers:{origin:config.origin,'content-type':'application/json',cookie,...(personal?{'x-slideready-account':'personal','x-slideready-deepseek-key':'test_personal_key_not_real_123'}:{})},body:JSON.stringify(body)});
 const cookie=(await access.invite(request('/api/invite',{token}))).headers.get('set-cookie')!.split(';')[0];
 store.reserve({inviteId:i.id,requestId:'school-used',reviewId:null,slideNumbers:[],kind:'probe'});
 expect((await access.probe(request('/api/probe',{},cookie))).status).toBe(429);
 const probe=await access.probe(request('/api/probe',{},cookie,true));expect(await probe.json()).toMatchObject({error:'PERSONAL_KEY_FAILED'});expect(fetcher).toHaveBeenCalledTimes(1);
 const school=vi.fn(),personal=vi.fn(async(slides:Parameters<typeof goodResult>[0])=>goodResult(slides));
 const service=createReviewService({access,checker:{check:school},personalChecker:()=>({check:personal}),store:()=>store});
 const reviewId=store.startReview(i.id,[1],i.generation,'personal');
 const body={reviewId,requestId:'11111111-1111-4111-8111-111111111111',settings:{subject:'Business',toeflLevel:3},slides:[{slideNumber:1,elements:[{shapeId:'2',elementId:'slide-1/shape-2',text:'The company sell goods.'}]}]};
 expect((await service.review(request('/api/review',body,cookie,true))).status).toBe(200);expect(personal).toHaveBeenCalledTimes(1);expect(school).not.toHaveBeenCalled();
 expect(store.stats(1).totals).toMatchObject({requests:3,schoolRequests:1,personalRequests:2});
 }finally{store.close();}
});
