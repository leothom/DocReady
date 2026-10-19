import {afterEach,expect,it,vi} from 'vitest';
import {scryptSync} from 'node:crypto';
import {InviteStore} from '../../src/lib/server/store';
import {createAccessService} from '../../src/lib/server/access';
import {createAdminService} from '../../src/lib/server/admin';
const origin='https://test.example';
const config={apiKey:'test',model:'deepseek-flash',origin,inviteSecret:'',sessionSecret:'s'.repeat(64),inviteVersion:'2',enabled:true};
const stores:InviteStore[]=[];
function setup(){const db=new InviteStore(':memory:',100);stores.push(db);const fetcher=vi.fn();const access=createAccessService({config,store:()=>db,fetcher});return {db,access,fetcher};}
function req(body:unknown,ip='first'){return new Request(origin+'/api/access',{method:'POST',headers:{origin,'content-type':'application/json','x-slideready-client':ip},body:JSON.stringify(body)});}
afterEach(()=>stores.splice(0).forEach(s=>s.close()));
it('grants the existing secure teacher session only for an approved exact address',async()=>{
 const t=setup(),profile=t.db.approveEmail('teacher.alpha@sendelta.com');
 const r=await t.access.email(req({email:' Teacher.Alpha@Sendelta.com '}));expect(r.status).toBe(200);
 const cookie=r.headers.get('set-cookie')!;for(const flag of ['HttpOnly','Secure','SameSite=Strict'])expect(cookie).toContain(flag);
 const auth=t.access.authorize(new Request(origin+'/api/review',{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookie.split(';')[0]}}));expect(auth).toMatchObject({inviteId:profile.id});
 expect(t.db.stats(1).totals.requests).toBe(0);expect(t.fetcher).not.toHaveBeenCalled();
 expect(await r.text()).not.toContain('teacher.alpha');
 for(const email of ['outside@sendelta.com','teacher.alpha@sub.sendelta.com','teacher.alpha+extra@sendelta.com','teacher.alpha@sendelta.com.invalid'])expect((await t.access.email(req({email}))).status).toBe(403);
});
it('preserves the profile across repeated sessions and blocks revoked or deleted approval',async()=>{
 const t=setup(),p=t.db.approveEmail('teacher.alpha@sendelta.com');
 for(let n=0;n<3;n++)expect((await t.access.email(req({email:p.email}))).status).toBe(200);
 expect(t.db.listInvites()).toHaveLength(1);t.db.revokeInvite(p.id);
 expect((await t.access.email(req({email:p.email}))).status).toBe(403);
 t.db.approveEmail(p.email!);expect((await t.access.email(req({email:p.email}))).status).toBe(403);
 t.db.restoreInvite(p.id);expect((await t.access.email(req({email:p.email}))).status).toBe(200);
 t.db.deleteInvite(p.id);expect((await t.access.email(req({email:p.email}))).status).toBe(403);
});
it('validates origin, schema, size and missing store without provider calls',async()=>{
 const t=setup();t.db.approveEmail('teacher.alpha@sendelta.com');
 const foreign=req({email:'teacher.alpha@sendelta.com'});foreign.headers.set('origin','https://other.example');expect((await t.access.email(foreign)).status).toBe(403);
 for(const body of [{},[],{email:5},{email:'bad'},{email:'teacher.alpha@sendelta.com',name:'x'}])expect((await t.access.email(req(body))).status).toBe(400);
 expect((await t.access.email(req({email:'x'.repeat(3000)}))).status).toBe(413);
 expect((await createAccessService({config}).email(req({email:'teacher.alpha@sendelta.com'}))).status).toBe(503);
 expect(t.fetcher).not.toHaveBeenCalled();
});
it('bad attempts from one client cannot spend another client valid allowance',async()=>{
 const t=setup();t.db.approveEmail('teacher.alpha@sendelta.com');
 for(let n=0;n<20;n++)await t.access.email(req({email:'no.access@sendelta.com'},'bad'));
 expect((await t.access.email(req({email:'teacher.alpha@sendelta.com'},'staff'))).status).toBe(200);expect(t.db.stats(1).totals.requests).toBe(0);
});
it('a slow body has a bounded deadline and does not leave the admission slot open',async()=>{
 vi.useFakeTimers();try{
  const t=setup();let cancelled=false;const stream=new ReadableStream({cancel(){cancelled=true;}});
  const request=new Request(origin+'/api/access',{method:'POST',headers:{origin,'content-type':'application/json'},body:stream,duplex:'half'} as RequestInit);
  const response=t.access.email(request);await vi.advanceTimersByTimeAsync(5100);expect((await response).status).toBe(408);expect(cancelled).toBe(true);
  t.db.approveEmail('teacher.alpha@sendelta.com');expect((await t.access.email(req({email:'teacher.alpha@sendelta.com'}))).status).toBe(200);
 }finally{vi.useRealTimers();}
});
it('only an owner can approve or restore emails, and approval never revives a block',async()=>{
 const t=setup(),salt='a'.repeat(32),admin=createAdminService(()=>t.db,origin,()=>salt+':'+scryptSync('correct password',salt,64).toString('hex'));
 const ownerReq=(body:unknown,cookie='')=>{const r=req(body);r.headers.set('x-slideready-admin','1');r.headers.set('cookie',cookie);return r;};
 expect((await admin(ownerReq({email:'teacher.alpha@sendelta.com'}),['emails'])).status).toBe(401);
 const login=await admin(ownerReq({password:'correct password'}),['login']),cookie=login.headers.get('set-cookie')!.split(';')[0];
 const r=await admin(ownerReq({email:'teacher.alpha@sendelta.com'},cookie),['emails']);expect(r.status).toBe(200);const {invite}=await r.json();
 t.db.revokeInvite(invite.id);await admin(ownerReq({email:'teacher.alpha@sendelta.com'},cookie),['emails']);expect(t.db.emailInvite('teacher.alpha@sendelta.com')).toBeNull();
 expect((await admin(ownerReq({},cookie),['invites',invite.id,'restore'])).status).toBe(200);expect(t.db.emailInvite('teacher.alpha@sendelta.com')?.id).toBe(invite.id);
});
