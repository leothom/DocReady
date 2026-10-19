import {it,expect} from "vitest";
import {evaluateCorpusCase,sumKnownAmounts,type CorpusCase} from "../support/corpus-quality";
import {findingSchema,type ModelFinding} from "../../src/lib/contracts";
const c:CorpusCase={id:"agreement",subject:"Business",text:["The company sell goods."],intent:"correction",category:"grammar",requiredEdits:[{from:"sell",to:"sells"}]};
const finding=(overrides:Partial<ModelFinding>={}):ModelFinding=>findingSchema.parse({slideNumber:1,shapeId:"2",elementId:"el-0",originalText:"The company sell goods.",suggestedText:"The company sells goods.",reviewType:"correction",category:"grammar",optional:false,confidence:.9,explanation:{en:"Use sells with the singular subject company.","zh-Hans":"company 是单数主语，动词应使用 sells。"},...overrides});
it("a grammar label cannot make an unchanged correction pass",()=>{
 const result=evaluateCorpusCase(c,[finding({suggestedText:"The company sell goods."})]);
 expect(result.passed).toBe(false);expect(result.issues).toContain("WRONG_CORRECTION");expect(result.issues).toContain("MISSED_CORRECTION");
});
it("a correction with changed meaning fails even if its category is right",()=>{
 const result=evaluateCorpusCase(c,[finding({suggestedText:"The company never sells goods."})]);
 expect(result.passed).toBe(false);expect(result.issues).toContain("WRONG_CORRECTION");
});
it("corrected words pass with different punctuation and case",()=>{
 const result=evaluateCorpusCase(c,[finding({suggestedText:"The company sells goods!"})]);
 expect(result.passed).toBe(true);expect(result.humanReview).toBe("pending");
});
it("a missing correction fails",()=>{
 expect(evaluateCorpusCase(c,[]).issues).toContain("MISSED_CORRECTION");
});
it("a valid empty response on a clean case passes but an incomplete review does not",()=>{
 const clean:CorpusCase={id:"clean",subject:"Science",text:["Plants need light."],intent:"no finding"};
 expect(evaluateCorpusCase(clean,[]).passed).toBe(true);
 expect(evaluateCorpusCase(clean,[],"failed").issues).toContain("REVIEW_INCOMPLETE");
});
it("false corrections and unwanted enhancements on clean text both fail",()=>{
 const clean={...c,text:["The company sells goods."],intent:"no finding"};
 expect(evaluateCorpusCase(clean,[finding({originalText:"The company sells goods.",suggestedText:"The firm sells goods."})]).issues).toContain("FALSE_CORRECTION");
 expect(evaluateCorpusCase(clean,[finding({originalText:"The company sells goods.",suggestedText:"The firm sells goods.",reviewType:"enhancement",category:"clarity",optional:true})]).issues).toContain("UNEXPECTED_FINDING");
});
it("optional enhancement cannot reduce compare and justify to list",()=>{
 const instruction:CorpusCase={id:"instruction",subject:"Business",text:["Compare both options and justify your choice."],intent:"optional enhancement",requiredDemand:["compare","justify"]};
 const change=finding({originalText:instruction.text[0],suggestedText:"List both options and choose one.",reviewType:"enhancement",category:"instruction_clarity",optional:true});
 expect(evaluateCorpusCase(instruction,[change]).issues).toContain("ACADEMIC_DEMAND_CHANGED");
});
it("an optional enhancement can preserve academic demand",()=>{
 const instruction:CorpusCase={id:"instruction",subject:"Business",text:["Compare both options and justify your choice."],intent:"optional enhancement",requiredDemand:["compare","justify"]};
 const change=finding({originalText:instruction.text[0],suggestedText:"Compare both options. Justify your choice.",reviewType:"enhancement",category:"instruction_clarity",optional:true});
 expect(evaluateCorpusCase(instruction,[change]).passed).toBe(true);
});
it("enhancements must keep required terms, numbers and negation",()=>{
 const term:CorpusCase={id:"term",subject:"Economics",text:["Do not change price elasticity of demand above 40."],intent:"no correction",protectedTerms:["price elasticity of demand"]};
 const change=finding({originalText:term.text[0],suggestedText:"Change demand above 50.",reviewType:"enhancement",category:"clarity",optional:true});
 expect(evaluateCorpusCase(term,[change]).issues).toContain("PROTECTED_CONTENT_CHANGED");
});
it("copied English text is not a Chinese explanation",()=>{
 const result=evaluateCorpusCase(c,[finding({explanation:{en:"Use sells with company.","zh-Hans":"Use sells with company."}})]);
 expect(result.passed).toBe(false);expect(result.issues).toContain("EXPLANATION_LANGUAGE_MISSING");
});
it("unknown cost stays unknown instead of becoming zero",()=>{
 expect(sumKnownAmounts([null,null])).toEqual({total:null,known:0,complete:false});
 expect(sumKnownAmounts([.2,null])).toEqual({total:null,known:.2,complete:false});
 expect(sumKnownAmounts([.2,.3])).toEqual({total:.5,known:.5,complete:true});
 expect(sumKnownAmounts([0])).toEqual({total:0,known:0,complete:true});
});
it("equivalent task wording preserves compare and justify",()=>{
 const instruction:CorpusCase={id:"instruction",subject:"Business",text:["Compare both options and justify your choice."],intent:"optional enhancement",requiredDemand:["compare","justify"]};
 const change=finding({originalText:instruction.text[0],suggestedText:"Compare both options and give reasons for your choice.",reviewType:"enhancement",category:"instruction_clarity",optional:true});
 expect(evaluateCorpusCase(instruction,[change]).passed).toBe(true);
});
it("unknown review intent fails instead of accepting empty output",()=>{
 expect(evaluateCorpusCase({...c,intent:"misspelled-intent"},[]).passed).toBe(false);
});
it("a correction case with no expected edit cannot pass",()=>{
 const missing={...c,requiredEdits:undefined};
 expect(evaluateCorpusCase(missing,[finding()]).passed).toBe(false);
});

const multi={id:"combined-context",subject:"Business",intent:"correction",text:["The company sell goods. Its manager approve the orders.","The company sells goods. Its manager approves the orders.","The company sell goods. Its manager approve the orders."],category:"grammar",
 expectedCorrections:[{elementIndex:0,category:"grammar",requiredEdits:[{from:"sell",to:"sells"},{from:"approve",to:"approves"}]},{elementIndex:2,category:"grammar",requiredEdits:[{from:"sell",to:"sells"},{from:"approve",to:"approves"}]}],noFindingElements:[1]};
const combined=(index:number,suggestedText="The company sells goods. Its manager approves the orders.")=>finding({elementId:"el-"+index,shapeId:String(index+2),originalText:multi.text[index],suggestedText});
it("requires both edits in each repeated error box",()=>{
 expect(evaluateCorpusCase(multi,[combined(0),combined(2)]).passed).toBe(true);
 expect(evaluateCorpusCase(multi,[combined(0)]).issues).toContain("MISSED_CORRECTION");
 expect(evaluateCorpusCase(multi,[combined(0,"The company sells goods. Its manager approve the orders."),combined(2)]).issues).toContain("WRONG_CORRECTION");
});
it("forbids an enhancement on the clean neighboring box",()=>{
 const extra=combined(1,"The company sells goods and its manager approves the orders.");
 extra.reviewType="enhancement";extra.category="clarity";extra.optional=true;
 expect(evaluateCorpusCase(multi,[combined(0),combined(2),extra]).issues).toContain("UNEXPECTED_FINDING");
});
