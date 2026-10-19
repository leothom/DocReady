import {describe,it,expect} from "vitest";
import {validateFindings} from "../../src/lib/review/findings";
import type {Slide} from "../../src/lib/contracts";
const batch:Slide[]=[{slideNumber:1,hidden:false,elements:[{elementId:"slide-1/shape-2",shapeId:"2",shapeName:"Body",text:"The company sell goods."}],warnings:[],extractionStatus:"read"}];
const finding=()=>({slideNumber:1,shapeId:"2",elementId:"slide-1/shape-2",reviewType:"correction",category:"grammar",originalText:"The company sell goods.",suggestedText:"The company sells goods.",explanation:{en:"Use sells with company.","zh-Hans":"company 是单数主语，动词应使用 sells。"},confidence:0.95,optional:false});
describe("review output contract",()=>{
 it("accepts an exact correction and adds a stable app id",()=>{
  const a=validateFindings({findings:[finding()]},batch) as {id:string}[];
  expect(a).toHaveLength(1);expect(a[0].id).toBeTruthy();
  expect(validateFindings({findings:[finding()]},batch)).toEqual(a);
 });
 it("accepts no findings as a valid result",()=>expect(validateFindings({findings:[]},batch)).toEqual([]));
 it("accepts a separate optional enhancement",()=>expect(validateFindings({findings:[{...finding(),reviewType:"enhancement",category:"instruction_clarity",optional:true}]},batch)).toHaveLength(1));
 for(const field of Object.keys(finding()))it("rejects a missing "+field,()=>{const f:Record<string,unknown>=finding();delete f[field];expect(()=>validateFindings({findings:[f]},batch)).toThrow("INVALID_FINDINGS");});
 it.each([
  {confidence:NaN},{confidence:Infinity},{confidence:1.1},{confidence:-.1},
  {slideNumber:2},{shapeId:"3"},{elementId:"unknown"},{originalText:"The company sell goods. "},
  {explanation:{en:"English only"}},{explanation:{en:" ","zh-Hans":"中文"}},
  {explanation:{en:"English","zh-Hans":""}},{explanation:"text"},
  {explanation:{en:"English","zh-Hans":"中文",fr:"Texte"}},{extra:"field"},
 ])("rejects invalid source, text or translation %j",change=>expect(()=>validateFindings({findings:[{...finding(),...change}]},batch)).toThrow("INVALID_FINDINGS"));
 it.each([
  {optional:true},{reviewType:"enhancement"},{category:"simplify"},{category:"unknown"},
  {suggestedText:"The company sell goods."},{suggestedText:" "},
 ])("rejects no-op or mismatched-category findings %j",change=>expect(()=>validateFindings({findings:[{...finding(),...change}]},batch)).toThrow("INVALID_FINDINGS"));
 it("rejects the whole batch when a sibling finding has no change",()=>{
  const noop={...finding(),suggestedText:finding().originalText};
  expect(()=>validateFindings({findings:[noop,finding()]},batch)).toThrow("INVALID_FINDINGS");
 });
 it("rejects unknown wrapper fields and malformed JSON shapes",()=>{
  for(const raw of [null,[],{findings:[],other:1},{findings:"none"}])expect(()=>validateFindings(raw,batch)).toThrow("INVALID_FINDINGS");
 });
 it("rejects conflicting duplicate changes to one element",()=>expect(()=>validateFindings({findings:[finding(),{...finding(),category:"spelling",suggestedText:"The firm sells goods."}]},batch)).toThrow("INVALID_FINDINGS"));
 it("rejects findings on failed slides",()=>expect(()=>validateFindings({findings:[finding()]},[{...batch[0],extractionStatus:"failed"}])).toThrow("INVALID_FINDINGS"));
 it("rejects the entire batch if one finding is invalid",()=>expect(()=>validateFindings({findings:[finding(),{...finding(),slideNumber:99}]},batch)).toThrow("INVALID_FINDINGS"));
});

it('omits only quote-style changes but retains meaningful punctuation',()=>{
 const source={...batch[0],elements:[{...batch[0].elements[0],text:"The bakery's bread."}]};
 const f={...finding(),category:'punctuation',originalText:source.elements[0].text,suggestedText:'The bakery’s bread.'};
 expect(validateFindings({findings:[f]},[source])).toEqual([]);
 expect(validateFindings({findings:[{...f,suggestedText:"The bakeries’ bread."}]},[source])).toHaveLength(1);
 expect(validateFindings({findings:[{...f,suggestedText:"The bakery's bread?"}]},[source])).toHaveLength(1);
});
