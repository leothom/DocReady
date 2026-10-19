import type {ExtractedDeck,Slide} from "../contracts";
import type {ReviewBatch} from "./types";
export function createBatches(deck:ExtractedDeck):ReviewBatch[]{
 const batches:ReviewBatch[]=[];let slides:Slide[]=[],characters=0;
 const flush=()=>{if(slides.length){batches.push({id:"batch-"+slides.map(s=>s.slideNumber).join("-"),slides,characters});slides=[];characters=0;}};
 for(const slide of deck.slides){
  if(slide.extractionStatus!=="read"||!slide.elements.some(e=>e.text.trim()))continue;
  const count=slide.elements.reduce((n,e)=>n+e.text.length,0);
  if(slides.length&&(slides.length===5||characters+count>12000))flush();
  slides.push(slide);characters+=count;
  if(characters>12000)flush();
 }
 flush();return batches;
}
