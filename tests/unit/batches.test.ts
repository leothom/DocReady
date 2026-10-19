import {it,expect} from "vitest";
import {createBatches} from "../../src/lib/review/batches";
import {reviewDeck,reviewSlide} from "../fixtures/review-deck";
it("limits each ordinary batch to five whole slides",()=>{
 const batches=createBatches(reviewDeck(Array.from({length:12},(_,i)=>reviewSlide(i+1))));
 expect(batches.map(b=>b.slides.length)).toEqual([5,5,2]);expect(batches.flatMap(b=>b.slides).map(s=>s.slideNumber)).toEqual(Array.from({length:12},(_,i)=>i+1));
});
it("uses 12000 characters and keeps an oversized single slide intact",()=>{
 const a=reviewSlide(1,"x".repeat(7000)),b=reviewSlide(2,"x".repeat(6000)),c=reviewSlide(3,"x".repeat(13000)),d=reviewSlide(4,"x".repeat(100));
 const batches=createBatches(reviewDeck([a,b,c,d]));
 expect(batches.map(x=>x.characters)).toEqual([7000,6000,13000,100]);expect(batches[2].slides[0]).toBe(c);
});
it("excludes failed and empty slides while retaining hidden readable slides",()=>{
 const batches=createBatches(reviewDeck([{...reviewSlide(1),extractionStatus:"failed"},{...reviewSlide(2),elements:[],extractionStatus:"empty"},{...reviewSlide(3),hidden:true}]));
 expect(batches.flatMap(b=>b.slides).map(x=>x.slideNumber)).toEqual([3]);
});
