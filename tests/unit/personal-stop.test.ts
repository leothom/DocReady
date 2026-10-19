import {it,expect,vi} from 'vitest';
import {analyzeDeck} from '../../src/lib/review/analyze';
import {ReviewError} from '../../src/lib/review/types';
import {reviewDeck,reviewSlide} from '../fixtures/review-deck';
it('stops unsent batches after the personal key is rejected',async()=>{
 const checker={check:vi.fn(async()=>{throw new ReviewError('PERSONAL_KEY_FAILED');})};
 const result=await analyzeDeck(reviewDeck(Array.from({length:30},(_,i)=>reviewSlide(i+1))),{subject:'Business',toeflLevel:3},checker,()=>{},new AbortController().signal);
 expect(checker.check.mock.calls.length).toBeLessThanOrEqual(2);
 expect(result.slides).toHaveLength(30);expect(result.slides.every(s=>s.status==='failed'&&s.errorCode==='PERSONAL_KEY_FAILED')).toBe(true);
 expect(result.metrics.attempts).toBe(checker.check.mock.calls.length);
});
