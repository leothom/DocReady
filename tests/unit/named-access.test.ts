import {it,expect,vi} from 'vitest';
import {randomUUID,scryptSync} from 'node:crypto';
import {InviteStore} from '../../src/lib/server/store';
import {createAccessService} from '../../src/lib/server/access';
import {createReviewService} from '../../src/lib/server/review';
import {createAdminService} from '../../src/lib/server/admin';
import {goodResult} from '../fixtures/review-deck';
const origin='https://test.example';
const config={apiKey:'test',model:'deepseek-flash',origin,inviteSecret:'old'.repeat(20),sessionSecret:'s'.repeat(64),inviteVersion:'2',enabled:true};
const req=(path:string,body:unknown,cookie='')=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',cookie,'x-slideready-admin':'1'},body:JSON.stringify(body)});
async function setup(){const db=new InviteStore(':memory:',2);const i=db.createInvite('Teacher',Date.now()+86400000);const access=createAccessService({config,store:()=>db});const r=await access.invite(req('/api/invite',{token:i.token}));return {db,i,access,cookie:r.headers.get('set-cookie')!.split(';')[0]};}
it('rejects legacy links and invalidates existing sessions after revoke',async()=>{
 const t=await setup();expect((await t.access.invite(req('/api/invite',{token:config.inviteSecret}))).status).toBe(401);
 expect(t.access.authorize(req('/api/review',{},t.cookie))).not.toBeInstanceOf(Response);
 t.db.revokeInvite(t.i.invite.id);expect((t.access.authorize(req('/api/review',{},t.cookie)) as Response).status).toBe(401);t.db.close();
});
it('malformed requests do not spend quota and duplicates never dispatch again',async()=>{
 const t=await setup(),checker={check:vi.fn(async b=>goodResult(b))};const service=createReviewService({access:t.access,checker,store:()=>t.db});
 expect((await service.review(req('/api/review',{},t.cookie))).status).toBe(400);expect(t.db.stats(7).totals.requests).toBe(0);
 const body={reviewId:t.db.startReview(t.i.invite.id,[1]),requestId:randomUUID(),settings:{subject:'Other',toeflLevel:3},slides:[{slideNumber:1,elements:[{shapeId:'2',elementId:'e',text:'The company sell goods.'}]}]};
 expect((await service.review(req('/api/review',body,t.cookie))).status).toBe(200);
 expect((await service.review(req('/api/review',body,t.cookie))).status).toBe(409);expect(checker.check).toHaveBeenCalledTimes(1);expect(t.db.stats(7).totals.slides).toBe(1);t.db.close();
});
it('admin requires its own password and cookie, and denies missing CSRF header',async()=>{
 const t=await setup(),salt='a'.repeat(32),hash=salt+':'+scryptSync('correct password',salt,64).toString('hex');const admin=createAdminService(()=>t.db,origin,()=>hash);
 expect((await admin(new Request(origin+'/api/admin/session',{headers:{origin,'x-slideready-admin':'1',cookie:t.cookie}}),['session'])).status).toBe(401);
 const bad=req('/api/admin/login',{password:'correct password'});bad.headers.delete('x-slideready-admin');expect((await admin(bad,['login'])).status).toBe(403);
 const r=await admin(req('/api/admin/login',{password:'correct password'}),['login']);expect(r.status).toBe(200);const cookie=r.headers.get('set-cookie')!.split(';')[0];
 expect((await admin(new Request(origin+'/api/admin/invites',{headers:{origin,'x-slideready-admin':'1',cookie}}),['invites'])).status).toBe(200);
 await admin(req('/api/admin/logout',{},cookie),['logout']);expect((await admin(new Request(origin+'/api/admin/session',{headers:{origin,'x-slideready-admin':'1',cookie}}),['session'])).status).toBe(401);t.db.close();
});
it('replacement rejects a review and probe waiting for their body',async()=>{
 const t=await setup(),checker={check:vi.fn(async b=>goodResult(b))},fetcher=vi.fn();
 const access=createAccessService({config,store:()=>t.db,fetcher});
 const service=createReviewService({access,checker,store:()=>t.db});
 const body={reviewId:t.db.startReview(t.i.invite.id,[1]),requestId:randomUUID(),settings:{subject:'Other',toeflLevel:3},slides:[{slideNumber:1,elements:[{shapeId:'2',elementId:'e',text:'The company sell goods.'}]}]};
 const pending=(path:string)=>{let send!:(value:unknown)=>void;const stream=new ReadableStream({start(controller){send=value=>{controller.enqueue(new TextEncoder().encode(JSON.stringify(value)));controller.close();};}});return {request:new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',cookie:t.cookie},body:stream,duplex:'half'} as RequestInit),send};};
 const review=pending('/api/review'),probe=pending('/api/probe');
 const r=service.review(review.request),p=access.probe(probe.request);
 t.db.rotateInvite(t.i.invite.id);review.send(body);probe.send({});
 expect((await r).status).toBe(401);expect((await p).status).not.toBe(200);
 expect(checker.check).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();expect(t.db.stats(7).totals.requests).toBe(0);t.db.close();
});
