import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { InviteStore } from '../../src/lib/server/store';
import { normalizeSchoolEmail } from '../../src/lib/server/email';

const DAY = 86400000;
let now = Date.UTC(2026, 9, 15, 2);
const stores = new Set<InviteStore>();
const dirs: string[] = [];
function open(path = ':memory:', limit = 100) { const s = new InviteStore(path, limit, () => now); stores.add(s); return s; }
function close(s: InviteStore) { s.close(); stores.delete(s); }
function file() { const dir = mkdtempSync(join(tmpdir(), 'email-store-')); dirs.push(dir); return join(dir, 'usage.sqlite'); }
function reserve(s: InviteStore, id: string, requestId: string, generation?: number) { s.reserve({inviteId:id, requestId, reviewId:null, slideNumbers:[], kind:'probe', generation}); }
afterEach(() => { for (const s of stores) s.close(); stores.clear(); for (const dir of dirs.splice(0)) rmSync(dir, {recursive:true,force:true}); now = Date.UTC(2026,9,15,2); });

describe('school email normalization', () => {
  it.each([
    [' Example.Teacher@Sendelta.COM ', 'example.teacher@sendelta.com'],
    ['example+class@sendelta.com', 'example+class@sendelta.com'],
    [null, null], [12, null], ['', null], ['example@other.com', null],
    ['example@dept.sendelta.com', null], ['example@sendelta.com.evil.test', null],
    ['example@sendeltа.com', null], ['K@example.com', null], ['K@sendelta.com', null],
    ['example..teacher@sendelta.com', null], ['.example@sendelta.com', null],
    ['example.@sendelta.com', null], ['example teacher@sendelta.com', null],
    ['example@sendelta.com\nother@sendelta.com', null], ['example@@sendelta.com', null],
    ['"example"@sendelta.com', null], ['a'.repeat(65) + '@sendelta.com', null],
    ['a'.repeat(255), null],
  ])('normalizes or rejects %s', (input, expected) => {
    expect(normalizeSchoolEmail(input)).toBe(expected);
  });
});

describe('durable approved email profiles', () => {
  it('requires an exact approved address and labels the owner profile', () => {
    const s = open();
    expect(s.emailInvite('example.teacher@sendelta.com')).toBeNull();
    const i = s.approveEmail(' Example.Teacher@Sendelta.COM ');
    expect(i).toMatchObject({email:'example.teacher@sendelta.com', name:'example.teacher@sendelta.com', dailyLimit:20, expiresAt:now+90*DAY, generation:1, revoked:false});
    expect(s.emailInvite('EXAMPLE.TEACHER@SENDELTA.COM')?.id).toBe(i.id);
    for (const address of ['exampleteacher@sendelta.com','example.teacher+class@sendelta.com','example.teacher@dept.sendelta.com','example.teacher@sendelta.com.evil.test']) expect(s.emailInvite(address)).toBeNull();
    expect(s.listInvites()).toEqual([i]);
    expect(() => s.approveEmail('example@other.com')).toThrow('INVALID_REQUEST');
    expect(s.listInvites()).toHaveLength(1);
  });
  it('reuses one profile across connections and restart without resetting allowance or expiry', () => {
    const path = file(); const a = open(path); const b = open(path);
    const i = a.approveEmail('sample@sendelta.com');
    a.updateInvite(i.id,{dailyLimit:1,expiresAt:now+DAY}); reserve(a,i.id,'used');
    expect(b.approveEmail(' SAMPLE@Sendelta.com ').id).toBe(i.id);
    expect(b.listInvites()).toHaveLength(1);
    close(a); close(b);
    const restarted = open(path); const again = restarted.approveEmail('sample@sendelta.com');
    expect(again).toMatchObject({id:i.id,dailyLimit:1,expiresAt:now+DAY});
    expect(restarted.stats(1,i.id).totals.requests).toBe(1);
    expect(() => reserve(restarted,again.id,'second')).toThrow('QUOTA_EXCEEDED');
  });
  it('keeps revoked and expired approvals blocked on repeated import', () => {
    const s = open(); const i = s.approveEmail('sample@sendelta.com');
    s.revokeInvite(i.id);
    expect(s.approveEmail('SAMPLE@sendelta.com')).toMatchObject({id:i.id,revoked:true,generation:2});
    expect(s.emailInvite('sample@sendelta.com')).toBeNull();
    expect(s.activeInvite(i.id,i.generation)).toBeNull();
    expect(() => reserve(s,i.id,'blocked',i.generation)).toThrow('INVITE_REQUIRED');
    s.restoreInvite(i.id);
    const restored = s.emailInvite('sample@sendelta.com');
    expect(restored).toMatchObject({id:i.id,revoked:false,generation:3,expiresAt:i.expiresAt});
    expect(s.activeInvite(i.id,2)).toBeNull();
    now += 90*DAY;
    expect(s.emailInvite('sample@sendelta.com')).toBeNull();
    expect(s.approveEmail('sample@sendelta.com').expiresAt).toBe(i.expiresAt);
    s.restoreInvite(i.id);
    expect(s.emailInvite('sample@sendelta.com')).toBeNull();
  });
  it('preserves consumed allowance when restored and rejects old session generations', () => {
    const s = open(); const i = s.approveEmail('sample@sendelta.com');
    s.updateInvite(i.id,{dailyLimit:1}); reserve(s,i.id,'used',i.generation);
    s.revokeInvite(i.id); s.restoreInvite(i.id);
    expect(() => reserve(s,i.id,'old',i.generation)).toThrow('INVITE_REQUIRED');
    expect(() => reserve(s,i.id,'current',3)).toThrow('QUOTA_EXCEEDED');
    expect(s.stats(1,i.id).totals.requests).toBe(1);
    expect(() => s.restoreInvite('missing')).toThrow('INVITE_REQUIRED');
  });
  it('deletes approval with personal history while preserving anonymous global allowance', () => {
    const path = file(); const s = open(path,1); const i = s.approveEmail('sample@sendelta.com');
    reserve(s,i.id,'used'); s.deleteInvite(i.id);
    expect(s.emailInvite('sample@sendelta.com')).toBeNull();
    expect(s.listInvites()).toEqual([]);
    expect(s.stats(1).perInvite).toEqual([]);
    expect(s.stats(1).totals.requests).toBe(1);
    close(s);
    const restarted = open(path,1);
    expect(restarted.emailInvite('sample@sendelta.com')).toBeNull();
    const added = restarted.approveEmail('sample@sendelta.com');
    expect(added.id).not.toBe(i.id);
    expect(() => reserve(restarted,added.id,'new')).toThrow('QUOTA_EXCEEDED');
  });
  it('upgrades schema 1 while keeping private links, sessions, history and limits', () => {
    const path = file(); const db = new DatabaseSync(path);
    db.exec(`PRAGMA user_version=1;
      CREATE TABLE invites(id TEXT PRIMARY KEY,name TEXT NOT NULL,tokenHash TEXT UNIQUE NOT NULL,expiresAt INTEGER NOT NULL,dailyLimit INTEGER NOT NULL,generation INTEGER NOT NULL,revoked INTEGER NOT NULL,createdAt INTEGER NOT NULL,firstUse INTEGER,lastUse INTEGER);
      CREATE TABLE reviews(id TEXT PRIMARY KEY,inviteId TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,declared TEXT NOT NULL,successful TEXT NOT NULL,createdAt INTEGER NOT NULL,admittedAt INTEGER,completed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE requests(id TEXT PRIMARY KEY,inviteId TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,reviewId TEXT,day TEXT NOT NULL,slides TEXT NOT NULL,status TEXT NOT NULL,createdAt INTEGER NOT NULL,model TEXT,errorCode TEXT);
      CREATE TABLE daily(inviteId TEXT NOT NULL,day TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(inviteId,day));
      CREATE TABLE admin_sessions(hash TEXT PRIMARY KEY,expiresAt INTEGER NOT NULL);`);
    const hash = (v:string) => createHash('sha256').update(v).digest('hex');
    db.prepare('INSERT INTO invites VALUES(?,?,?,?,?,1,0,?,?,?)').run('legacy','Example Teacher',hash('legacy-token'),now+DAY,1,now,now,now);
    db.prepare('INSERT INTO admin_sessions VALUES(?,?)').run(hash('legacy-session'),now+DAY);
    db.prepare('INSERT INTO reviews VALUES(?,?,?,?,?,?,?)').run('review','legacy','[1]','[]',now,now,0);
    db.prepare('INSERT INTO requests VALUES(?,?,?,?,?,?,?,?,?)').run('used','legacy','review','2026-10-15','[1]','pending',now,null,null);
    const counts = {requests:1,successfulRequests:0,failedRequests:0,pendingRequests:1,slides:0,reviews:1,completedReviews:0,partialReviews:1,inputTokens:0,outputTokens:0,cachedInputTokens:0,costUsd:0,unknownUsageRequests:1,unknownCostRequests:1};
    for (const id of ['', 'legacy']) db.prepare('INSERT INTO daily VALUES(?,?,?)').run(id,'2026-10-15',JSON.stringify(counts));
    db.close();
    const s = open(path);
    expect(s.redeem('legacy-token')).toMatchObject({id:'legacy',name:'Example Teacher',dailyLimit:1});
    expect(s.validAdminSession('legacy-session')).toBe(true);
    expect(s.stats(1,'legacy').totals).toMatchObject({requests:1,pendingRequests:1,reviews:1});
    expect(() => reserve(s,'legacy','second')).toThrow('QUOTA_EXCEEDED');
    s.finish('used','success');
    expect(s.stats(1,'legacy').totals).toMatchObject({successfulRequests:1,slides:1,completedReviews:1});
    expect(s.approveEmail('example.teacher@sendelta.com').id).not.toBe('legacy');
    expect(s.listInvites()).toHaveLength(2);
    close(s);
    const inspect = new DatabaseSync(path);
    expect(inspect.prepare('PRAGMA user_version').get()).toMatchObject({user_version:3});
    inspect.exec('PRAGMA foreign_keys=ON');
    expect(() => inspect.prepare('INSERT INTO email_invites(email,inviteId) VALUES(?,?)').run('missing@sendelta.com','missing')).toThrow();
    inspect.close();
  });
  it('rejects schema versions newer than this application', () => {
    const path = file(); const db = new DatabaseSync(path); db.exec('PRAGMA user_version=4'); db.close();
    expect(() => open(path)).toThrow('INVALID_CONFIGURATION');
  });
});
