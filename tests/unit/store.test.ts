import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InviteStore } from '../../src/lib/server/store';

const stores: InviteStore[] = [];
const dirs: string[] = [];
let now = Date.UTC(2026, 9, 14, 15, 59);
function open(limit = 5, path = ':memory:') { const store = new InviteStore(path, limit, () => now); stores.push(store); return store; }
function invite(store: InviteStore, limit = 3) { return store.createInvite('Teacher', now + 86400000, limit); }
function reserve(store: InviteStore, id: string, requestId: string, reviewId: string | null = null, slideNumbers: number[] = []) { store.reserve({inviteId: id, requestId, reviewId, slideNumbers, kind: reviewId ? 'review' : 'probe'}); }
afterEach(() => { for (const s of stores.splice(0)) s.close(); for (const d of dirs.splice(0)) rmSync(d, {recursive:true,force:true}); now = Date.UTC(2026, 9, 14, 15, 59); });
describe('durable invite store', () => {
  it('keeps quotas across connections and restart, without storing tokens', () => {
    const dir = mkdtempSync(join(tmpdir(), 'invite-test-')); dirs.push(dir); const path = join(dir,'usage.sqlite');
    const a = open(5,path); const created = invite(a,1); reserve(a,created.invite.id,'a');
    const b = open(5,path); expect(() => reserve(b,created.invite.id,'b')).toThrow('QUOTA_EXCEEDED');
    expect(b.redeem(created.token)?.name).toBe('Teacher');
    expect(readFileSync(path).includes(Buffer.from(created.token))).toBe(false);
  });
  it('invalidates replaced and revoked access', () => {
    const s = open(); const first = invite(s); const next = s.rotateInvite(first.invite.id);
    expect(s.redeem(first.token)).toBeNull(); expect(s.activeInvite(first.invite.id,first.invite.generation)).toBeNull();
    expect(s.redeem(next.token)?.id).toBe(first.invite.id); s.revokeInvite(first.invite.id); expect(s.redeem(next.token)).toBeNull();
  });
  it('rejects an old generation at admission after an earlier access check passed', () => {
    const s=open(); const {invite:i}=invite(s); const review=s.startReview(i.id,[1],i.generation);
    expect(s.activeInvite(i.id,i.generation)?.id).toBe(i.id);
    const replacement=s.rotateInvite(i.id);
    expect(()=>s.startReview(i.id,[1],i.generation)).toThrow('INVITE_REQUIRED');
    expect(()=>s.reserve({inviteId:i.id,reviewId:review,requestId:'stale',slideNumbers:[1],kind:'review',generation:i.generation})).toThrow('INVITE_REQUIRED');
    expect(s.stats(1).totals.requests).toBe(0);
    s.reserve({inviteId:i.id,reviewId:review,requestId:'current',slideNumbers:[1],kind:'review',generation:replacement.invite.generation});
    expect(s.stats(1).totals.requests).toBe(1);
  });
  it('deduplicates requests and successful slides but counts intentional retries', () => {
    const s = open(); const {invite:i} = invite(s); const review = s.startReview(i.id,[1,2]);
    reserve(s,i.id,'a',review,[1]); expect(() => reserve(s,i.id,'a',review,[1])).toThrow('DUPLICATE_REQUEST');
    s.finish('a','success'); reserve(s,i.id,'b',review,[1,2]); s.finish('b','success'); s.finish('b','success');
    expect(s.stats(7).totals).toMatchObject({requests:2,slides:2,reviews:1,completedReviews:1,unknownUsageRequests:2,unknownCostRequests:2});
  });
  it('removes identifiable data but preserves global quota and unknown in-flight cost', () => {
    const s = open(1); const {invite:i} = invite(s); reserve(s,i.id,'a'); s.deleteInvite(i.id); s.finish('a','success');
    expect(s.stats(7).perInvite).toEqual([]); expect(s.stats(7).totals.requests).toBe(1);
    const other = invite(s); expect(() => reserve(s,other.invite.id,'b')).toThrow('QUOTA_EXCEEDED');
  });
  it('resets daily allowance at Hong Kong midnight and denies bad configuration', () => {
    const s = open(1); const {invite:i} = invite(s); reserve(s,i.id,'a'); now += 120000; reserve(s,i.id,'b');
    expect(s.stats(7).daily).toHaveLength(2); expect(() => open(NaN)).toThrow('INVALID_CONFIGURATION');
  });
  it('rejects cross-invite reviews and invalid slides without consuming allowance', () => {
    const s = open(1); const a = invite(s), b = invite(s); const review = s.startReview(a.invite.id,[1]);
    expect(() => reserve(s,b.invite.id,'a',review,[1])).toThrow('INVALID_REQUEST');
    expect(() => reserve(s,a.invite.id,'a',review,[2])).toThrow('INVALID_REQUEST');
    reserve(s,a.invite.id,'a',review,[1]); expect(s.stats(7).totals.requests).toBe(1);
  });
  it('expires and removes admin sessions', () => {
    const s = open(); const token = s.createAdminSession(); expect(s.validAdminSession(token)).toBe(true);
    now += 8 * 3600000; expect(s.validAdminSession(token)).toBe(false);
    const second = s.createAdminSession(); s.deleteAdminSession(second); expect(s.validAdminSession(second)).toBe(false);
    const third = s.createAdminSession(); s.clearAdminSessions(); expect(s.validAdminSession(third)).toBe(false);
  });
  it('records only admitted reviews and retains aggregate counts after ledger expiry', () => {
    const s = open(); const {invite:i} = s.createInvite('Teacher',now+400*86400000);
    const review = s.startReview(i.id,[1,2]);
    expect(s.stats(7).perInvite[0]).toMatchObject({reviews:0,firstUse:null,lastUse:null});
    reserve(s,i.id,'a',review,[1]); s.finish('a','success',{usage:{inputTokens:10,outputTokens:4,cachedInputTokens:null},costUsd:null,model:'deepseek-chat'});
    reserve(s,i.id,'b',review,[2]); s.finish('b','failed',undefined,'PROVIDER_UNAVAILABLE');
    expect(s.stats(7).totals).toMatchObject({reviews:1,partialReviews:1,completedReviews:0,slides:1,inputTokens:10,outputTokens:4,unknownUsageRequests:2,failedRequests:1});
    now+=31*86400000; s.cleanup(); expect(s.stats(90).totals.requests).toBe(2);
    s.finish('a','success'); expect(s.stats(90).totals.slides).toBe(1);
    now+=335*86400000; s.cleanup(); expect(s.stats(365).totals.requests).toBe(0);
  });
  it('limits unused review IDs and rejects expired invites', () => {
    const s = open(); const {invite:i} = invite(s);
    for(let n=0;n<20;n++) s.startReview(i.id,[1]);
    expect(()=>s.startReview(i.id,[1])).toThrow('RATE_LIMITED');
    now+=61000; expect(()=>s.startReview(i.id,[1])).toThrow('RATE_LIMITED');
    now+=3600000; expect(s.startReview(i.id,[1])).toEqual(expect.any(String));
    expect(s.stats(7).totals.requests).toBe(0);
    now+=86400000; expect(()=>reserve(s,i.id,'a')).toThrow('INVITE_REQUIRED');
  });
  it('records known costs once and rejects invalid updates atomically', () => {
    const s=open(); const {invite:i}=invite(s); reserve(s,i.id,'a');
    const metrics={usage:{inputTokens:10,outputTokens:5,cachedInputTokens:2},costUsd:0.005,model:'deepseek-chat'};
    s.finish('a','success',metrics); s.finish('a','success',metrics);
    expect(s.stats(7).totals).toMatchObject({costUsd:0.005,inputTokens:10,outputTokens:5,cachedInputTokens:2,unknownUsageRequests:0,unknownCostRequests:0});
    expect(()=>s.updateInvite(i.id,{name:'Changed',dailyLimit:0})).toThrow('INVALID_CONFIGURATION');
    expect(s.listInvites()[0].name).toBe('Teacher');
  });
});
