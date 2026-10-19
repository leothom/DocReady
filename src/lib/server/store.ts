import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { normalizeSchoolEmail } from './email';

export type Invite = { id:string; name:string; email?:string; expiresAt:number; dailyLimit:number; generation:number; revoked:boolean; createdAt:number };
export class StoreError extends Error { constructor(public readonly code:string) { super(code); this.name = 'StoreError'; } }
export type Payer = 'school' | 'personal';
export type UsageCounts = { schoolRequests:number; personalRequests:number; schoolCostUsd:number; personalCostUsd:number; requests:number; successfulRequests:number; failedRequests:number; pendingRequests:number; slides:number; reviews:number; completedReviews:number; partialReviews:number; inputTokens:number; outputTokens:number; cachedInputTokens:number; costUsd:number; unknownUsageRequests:number; unknownCostRequests:number };
export type UsageStats = { daily: (UsageCounts & {date:string})[]; perInvite:(UsageCounts & {inviteId:string;name:string;firstUse:number|null;lastUse:number|null})[]; totals:UsageCounts };
type Row = Record<string, string | number | null>;
const DAY = 86400000;
const hash = (token:string) => createHash('sha256').update(token).digest('hex');
const date = (time:number) => new Date(time + 8 * 3600000).toISOString().slice(0,10);
const empty = (): UsageCounts => ({schoolRequests:0,personalRequests:0,schoolCostUsd:0,personalCostUsd:0,requests:0,successfulRequests:0,failedRequests:0,pendingRequests:0,slides:0,reviews:0,completedReviews:0,partialReviews:0,inputTokens:0,outputTokens:0,cachedInputTokens:0,costUsd:0,unknownUsageRequests:0,unknownCostRequests:0});
const keys = Object.keys(empty()) as (keyof UsageCounts)[];
function slides(value:number[], allowEmpty=false) { if (!Array.isArray(value) || value.length > 150 || (!allowEmpty && value.length===0) || value.some(n => !Number.isSafeInteger(n) || n<1 || n>150) || new Set(value).size !== value.length) throw new StoreError('INVALID_REQUEST'); }
function limits(value:number) { if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new StoreError('INVALID_CONFIGURATION'); }

/** Single-host SQLite accounting. Each admission is committed before provider dispatch. */
export class InviteStore {
  private db:DatabaseSync;
  private lastCleanup = 0;
  constructor(path:string, private globalLimit:number, private now:()=>number = Date.now) {
    limits(globalLimit);
    if (!path) throw new StoreError('INVALID_CONFIGURATION');
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive:true,mode:0o700});
    this.db = new DatabaseSync(path);
    const version = Number((this.db.prepare('PRAGMA user_version').get() as Row).user_version);
    if (version > 3) { this.db.close(); throw new StoreError('INVALID_CONFIGURATION'); }
    if (path !== ':memory:') chmodSync(path,0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON;`);
    this.db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS invites(id TEXT PRIMARY KEY,name TEXT NOT NULL,tokenHash TEXT UNIQUE NOT NULL,expiresAt INTEGER NOT NULL,dailyLimit INTEGER NOT NULL,generation INTEGER NOT NULL,revoked INTEGER NOT NULL,createdAt INTEGER NOT NULL,firstUse INTEGER,lastUse INTEGER);
      CREATE TABLE IF NOT EXISTS email_invites(email TEXT PRIMARY KEY,inviteId TEXT UNIQUE NOT NULL REFERENCES invites(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,inviteId TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,declared TEXT NOT NULL,successful TEXT NOT NULL,createdAt INTEGER NOT NULL,admittedAt INTEGER,completed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,inviteId TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,reviewId TEXT,day TEXT NOT NULL,slides TEXT NOT NULL,status TEXT NOT NULL,createdAt INTEGER NOT NULL,model TEXT,errorCode TEXT);
      CREATE TABLE IF NOT EXISTS daily(inviteId TEXT NOT NULL,day TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(inviteId,day));
      CREATE TABLE IF NOT EXISTS admin_sessions(hash TEXT PRIMARY KEY,expiresAt INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expiresAt INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS reviews_invite ON reviews(inviteId,createdAt);
      CREATE INDEX IF NOT EXISTS requests_created ON requests(createdAt);
      `);
    for(const table of ['reviews','requests']) {
      const columns=this.db.prepare('PRAGMA table_info('+table+')').all() as Row[];
      if(!columns.some(c=>c.name==='payer')) this.db.exec("ALTER TABLE "+table+" ADD COLUMN payer TEXT NOT NULL DEFAULT 'legacy'");
    }
    this.db.exec('PRAGMA user_version=3; COMMIT;');
    this.cleanup();
  }
  close() { this.db.close(); }
  private tx<T>(fn:()=>T):T { this.db.exec('BEGIN IMMEDIATE'); try { const result=fn(); this.db.exec('COMMIT'); return result; } catch(error) { this.db.exec('ROLLBACK'); throw error; } }
  private one(sql:string,...args:(string|number)[]) { return this.db.prepare(sql).get(...args) as Row | undefined; }
  private toInvite(row:Row):Invite { return {id:String(row.id),name:String(row.name),...(typeof row.email==='string'?{email:row.email}:{}),expiresAt:Number(row.expiresAt),dailyLimit:Number(row.dailyLimit),generation:Number(row.generation),revoked:!!row.revoked,createdAt:Number(row.createdAt)}; }
  private required(id:string) { const row=this.one('SELECT i.*,e.email FROM invites i LEFT JOIN email_invites e ON e.inviteId=i.id WHERE i.id=?',id); if (!row) throw new StoreError('INVITE_REQUIRED'); return this.toInvite(row); }
  private active(id:string,generation?:number) { const i=this.required(id); if(i.revoked || i.expiresAt<=this.now() || generation!==undefined && i.generation!==generation) throw new StoreError('INVITE_REQUIRED'); return i; }
  private validate(name:string,expiresAt:number,dailyLimit:number) { if(typeof name!=='string' || !name.trim() || name.trim().length>120 || /[\u0000-\u001f]/.test(name) || !Number.isSafeInteger(expiresAt) || expiresAt<=this.now()) throw new StoreError('INVALID_REQUEST'); limits(dailyLimit); }
  createInvite(name:string,expiresAt:number,dailyLimit=20) { this.validate(name,expiresAt,dailyLimit); const token=randomBytes(32).toString('base64url'); const id=randomUUID(); this.db.prepare('INSERT INTO invites VALUES(?,?,?,?,?,1,0,?,NULL,NULL)').run(id,name.trim(),hash(token),expiresAt,dailyLimit,this.now()); return {invite:this.required(id),token}; }
  approveEmail(email:string):Invite { const normalized=normalizeSchoolEmail(email); if(!normalized) throw new StoreError('INVALID_REQUEST'); return this.tx(()=>{ const existing=this.one('SELECT inviteId FROM email_invites WHERE email=?',normalized); if(existing) return this.required(String(existing.inviteId)); const {invite}=this.createInvite(normalized,this.now()+90*DAY,20); this.db.prepare('INSERT INTO email_invites(email,inviteId) VALUES(?,?)').run(normalized,invite.id); return this.required(invite.id); }); }
  emailInvite(email:string):Invite|null { const normalized=normalizeSchoolEmail(email); if(!normalized) return null; const row=this.one('SELECT i.*,e.email FROM email_invites e JOIN invites i ON i.id=e.inviteId WHERE e.email=? AND i.revoked=0 AND i.expiresAt>?',normalized,this.now()); return row?this.toInvite(row):null; }
  listInvites() { return (this.db.prepare('SELECT i.*,e.email FROM invites i LEFT JOIN email_invites e ON e.inviteId=i.id ORDER BY i.createdAt DESC,i.id').all() as Row[]).map(r=>this.toInvite(r)); }
  updateInvite(id:string,patch:{name?:string;expiresAt?:number;dailyLimit?:number}) { this.tx(()=>{ const i=this.required(id); const name=patch.name??i.name, expiry=patch.expiresAt??i.expiresAt, limit=patch.dailyLimit??i.dailyLimit; if(patch.expiresAt===undefined && expiry<=this.now()) { this.validate(name,this.now()+1,limit); } else this.validate(name,expiry,limit); this.db.prepare('UPDATE invites SET name=?,expiresAt=?,dailyLimit=? WHERE id=?').run(name.trim(),expiry,limit,id); }); }
  revokeInvite(id:string) { this.db.prepare('UPDATE invites SET revoked=1,generation=generation+1 WHERE id=?').run(id); }
  restoreInvite(id:string) { this.tx(()=>{ this.required(id); this.db.prepare('UPDATE invites SET revoked=0,generation=generation+1 WHERE id=?').run(id); }); }
  rotateInvite(id:string) { return this.tx(()=> { this.required(id); const token=randomBytes(32).toString('base64url'); this.db.prepare('UPDATE invites SET tokenHash=?,generation=generation+1,revoked=0 WHERE id=?').run(hash(token),id); return {invite:this.required(id),token}; }); }
  deleteInvite(id:string) { this.tx(()=>{ this.db.prepare('DELETE FROM daily WHERE inviteId=?').run(id); this.db.prepare('DELETE FROM invites WHERE id=?').run(id); }); this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); }
  redeem(token:string) { if(typeof token!=='string' || token.length>200) return null; const row=this.one('SELECT * FROM invites WHERE tokenHash=? AND revoked=0 AND expiresAt>?',hash(token),this.now()); return row?this.toInvite(row):null; }
  activeInvite(id:string,generation:number) { const row=this.one('SELECT * FROM invites WHERE id=? AND generation=? AND revoked=0 AND expiresAt>?',id,generation,this.now()); return row?this.toInvite(row):null; }
  private counts(id:string,day:string):UsageCounts { const row=this.one('SELECT data FROM daily WHERE inviteId=? AND day=?',id,day); return row ? {...empty(),...JSON.parse(String(row.data))} : empty(); }
  private add(id:string,day:string,delta:Partial<UsageCounts>) { const value=this.counts(id,day); for(const key of keys) value[key]+=delta[key]??0; this.db.prepare('INSERT INTO daily VALUES(?,?,?) ON CONFLICT(inviteId,day) DO UPDATE SET data=excluded.data').run(id,day,JSON.stringify(value)); }
  private both(id:string,day:string,delta:Partial<UsageCounts>) { this.add('',day,delta); this.add(id,day,delta); }
  private quota(i:Invite,day:string) { if(this.counts(i.id,day).requests-this.counts(i.id,day).personalRequests>=i.dailyLimit || this.counts('',day).requests-this.counts('',day).personalRequests>=this.globalLimit) throw new StoreError('QUOTA_EXCEEDED'); }
  private periodicCleanup() { if(this.now()-this.lastCleanup>=3600000) this.cleanup(); }
  startReview(inviteId:string,slideNumbers:number[],generation?:number,payer:Payer='school') { if(!['school','personal'].includes(payer))throw new StoreError('INVALID_REQUEST'); slides(slideNumbers); this.periodicCleanup(); return this.tx(()=>{ const i=this.active(inviteId,generation); if(payer==='school')this.quota(i,date(this.now())); this.db.prepare('DELETE FROM reviews WHERE inviteId=? AND admittedAt IS NULL AND createdAt<=?').run(inviteId,this.now()-3600000); const count=this.one('SELECT COUNT(*) AS count FROM reviews WHERE inviteId=? AND (createdAt>? OR admittedAt IS NULL)',inviteId,this.now()-60000); if(Number(count?.count)>=20) throw new StoreError('RATE_LIMITED'); const id=randomUUID(); this.db.prepare('INSERT INTO reviews(id,inviteId,declared,successful,createdAt,payer) VALUES(?,?,?,?,?,?)').run(id,inviteId,JSON.stringify(slideNumbers),'[]',this.now(),payer); return id; }); }
  reserve(input:{inviteId:string;reviewId:string|null;requestId:string;slideNumbers:number[];kind:'review'|'probe';generation?:number;payer?:Payer}) {
    const {inviteId,reviewId,requestId,slideNumbers,kind,generation,payer='school'}=input;
    slides(slideNumbers,kind==='probe');
    if(!['school','personal'].includes(payer) || typeof requestId!=='string' || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId) || !['review','probe'].includes(kind) || (kind==='probe' && (reviewId!==null || slideNumbers.length!==0)) || (kind==='review' && !reviewId)) throw new StoreError('INVALID_REQUEST');
    this.periodicCleanup();
    this.tx(()=>{ const i=this.active(inviteId,generation); if(this.one('SELECT id FROM requests WHERE id=?',requestId)) throw new StoreError('DUPLICATE_REQUEST');
      const day=date(this.now()); let review:Row|undefined;
      if(reviewId) { review=this.one('SELECT * FROM reviews WHERE id=? AND inviteId=?',reviewId,inviteId); if(!review || review.payer!=='legacy' && review.payer!==payer || Number(review.createdAt)<this.now()-30*DAY || review.admittedAt===null && Number(review.createdAt)<=this.now()-3600000 || slideNumbers.some(n=>!(JSON.parse(String(review!.declared)) as number[]).includes(n))) throw new StoreError('INVALID_REQUEST'); }
      if(payer==='school')this.quota(i,day);
      this.db.prepare('INSERT INTO requests(id,inviteId,reviewId,day,slides,status,createdAt,payer) VALUES(?,?,?,?,?,?,?,?)').run(requestId,inviteId,reviewId,day,JSON.stringify(slideNumbers),'pending',this.now(),payer);
      this.both(inviteId,day,{[payer==='personal'?'personalRequests':'schoolRequests']:1,requests:1,pendingRequests:1,unknownUsageRequests:1,unknownCostRequests:1});
      if(review && review.admittedAt===null) { this.db.prepare('UPDATE reviews SET admittedAt=? WHERE id=?').run(this.now(),reviewId); this.db.prepare('UPDATE invites SET firstUse=COALESCE(firstUse,?),lastUse=? WHERE id=?').run(this.now(),this.now(),inviteId); this.both(inviteId,day,{reviews:1,partialReviews:1}); }
    });
  }
  finish(requestId:string,outcome:'success'|'failed',metrics?:{usage:{inputTokens:number|null;outputTokens:number|null;cachedInputTokens:number|null};costUsd:number|null;model:string},errorCode?:string) {
    if(outcome!=='success' && outcome!=='failed') throw new StoreError('INVALID_REQUEST');
    this.tx(()=>{ const request=this.one('SELECT * FROM requests WHERE id=?',requestId); if(!request || request.status!=='pending') return;
      const id=String(request.inviteId), day=String(request.day); const delta:Partial<UsageCounts>={pendingRequests:-1,[outcome==='success'?'successfulRequests':'failedRequests']:1};
      const valid=(n:unknown):n is number => typeof n==='number' && Number.isFinite(n) && n>=0;
      if(metrics) { const usage=metrics.usage; if(usage && valid(usage.inputTokens)&&valid(usage.outputTokens)&&valid(usage.cachedInputTokens)) delta.unknownUsageRequests=-1;
        for(const key of ['inputTokens','outputTokens','cachedInputTokens'] as const) if(valid(usage?.[key])) delta[key]=usage[key]!;
        if(valid(metrics.costUsd)) { delta.costUsd=metrics.costUsd; if(request.payer==='school')delta.schoolCostUsd=metrics.costUsd; if(request.payer==='personal')delta.personalCostUsd=metrics.costUsd; delta.unknownCostRequests=-1; }
      }
      this.db.prepare('UPDATE requests SET status=?,model=?,errorCode=? WHERE id=?').run(outcome,metrics?.model && /^[a-zA-Z0-9._-]{1,100}$/.test(metrics.model)?metrics.model:null,errorCode && /^[A-Z0-9_]{1,80}$/.test(errorCode)?errorCode:null,requestId);
      if(outcome==='success' && request.reviewId) { const review=this.one('SELECT * FROM reviews WHERE id=?',String(request.reviewId)); if(review) { const successful=new Set<number>(JSON.parse(String(review.successful))); const before=successful.size; for(const n of JSON.parse(String(request.slides))) successful.add(n); delta.slides=successful.size-before; const complete=(JSON.parse(String(review.declared)) as number[]).every(n=>successful.has(n)); this.db.prepare('UPDATE reviews SET successful=?,completed=? WHERE id=?').run(JSON.stringify([...successful]),Number(complete),String(review.id)); if(complete && !review.completed) this.both(id,date(Number(review.admittedAt)),{completedReviews:1,partialReviews:-1}); } }
      this.both(id,day,delta);
    });
  }
  stats(days:number,inviteId?:string):UsageStats { if(!Number.isInteger(days)||days<1||days>365) throw new StoreError('INVALID_REQUEST'); this.cleanup(); const cutoff=date(this.now()-(days-1)*DAY); const totals=empty(); const daily=(this.db.prepare('SELECT day,data FROM daily WHERE inviteId=? AND day>=? ORDER BY day').all(inviteId??'',cutoff) as Row[]).map(row=>{ const value={...empty(),...JSON.parse(String(row.data))} as UsageCounts; for(const key of keys) totals[key]+=value[key]; return {date:String(row.day),...value}; }); const perInvite=(this.db.prepare('SELECT * FROM invites ORDER BY createdAt DESC,id').all() as Row[]).filter(r=>!inviteId || r.id===inviteId).map(r=>{ const value=empty(); for(const row of this.db.prepare('SELECT data FROM daily WHERE inviteId=? AND day>=?').all(String(r.id),cutoff) as Row[]) { const n=JSON.parse(String(row.data)); for(const key of keys) value[key]+=n[key]??0; } return {inviteId:String(r.id),name:String(r.name),firstUse:r.firstUse===null?null:Number(r.firstUse),lastUse:r.lastUse===null?null:Number(r.lastUse),...value}; }); return {daily,perInvite,totals}; }
  createAdminSession() { this.cleanup(); const token=randomBytes(32).toString('base64url'); this.tx(()=>{ this.db.prepare('DELETE FROM admin_sessions WHERE hash IN (SELECT hash FROM admin_sessions ORDER BY expiresAt DESC LIMIT -1 OFFSET 99)').run(); this.db.prepare('INSERT INTO admin_sessions VALUES(?,?)').run(hash(token),this.now()+8*3600000); }); return token; }
  validAdminSession(token:string) { return typeof token==='string' && token.length<=200 && !!this.one('SELECT hash FROM admin_sessions WHERE hash=? AND expiresAt>?',hash(token),this.now()); }
  deleteAdminSession(token:string) { this.db.prepare('DELETE FROM admin_sessions WHERE hash=?').run(hash(token)); }
  clearAdminSessions() { this.db.prepare('DELETE FROM admin_sessions').run(); }
  /** Increment a rate limit counter. Returns true if the limit is exceeded. */
  checkRate(key:string,max:number,windowMs:number=60000):boolean {
    const time=this.now();
    this.db.prepare('DELETE FROM rate_limits WHERE expiresAt<=?').run(time);
    const row=this.one('SELECT count,expiresAt FROM rate_limits WHERE key=?',key);
    const expires=row?Number(row.expiresAt):time+windowMs;
    const count=row?Number(row.count)+1:1;
    this.db.prepare('INSERT INTO rate_limits VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,expiresAt=excluded.expiresAt').run(key,count,expires);
    return count>max;
  }
  cleanup() { this.tx(()=>{ this.db.prepare('DELETE FROM requests WHERE createdAt<?').run(this.now()-30*DAY); this.db.prepare('DELETE FROM reviews WHERE createdAt<? OR (admittedAt IS NULL AND createdAt<=?)').run(this.now()-30*DAY,this.now()-3600000); this.db.prepare('DELETE FROM daily WHERE day<?').run(date(this.now()-364*DAY)); this.db.prepare('DELETE FROM admin_sessions WHERE expiresAt<=?').run(this.now()); this.db.prepare('DELETE FROM rate_limits WHERE expiresAt<=?').run(this.now()); }); this.lastCleanup=this.now(); }
}
