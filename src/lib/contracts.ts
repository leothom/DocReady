import {z} from "zod";
export type TextElement={elementId:string;shapeId:string;shapeName:string;text:string;tableCell?:{row:number;column:number}};
export type Slide={slideNumber:number;hidden:boolean;elements:TextElement[];warnings:string[];extractionStatus:"read"|"empty"|"failed"};
export type ExtractedDeck={slides:Slide[];warnings:string[];extractedCharacters:number};
export const SUBJECTS=["Business","Economics","English","Mathematics","Science","Humanities","Other"] as const;
export const reviewSettingsSchema=z.object({
 subject:z.enum(SUBJECTS),
 toeflLevel:z.number().min(1).max(6).refine(n=>Number.isInteger(n*2)),
}).strict();
export type ReviewSettings=z.infer<typeof reviewSettingsSchema>;
const fields={
 slideNumber:z.number().int().min(1).max(150),
 shapeId:z.string().min(1).max(200),
 elementId:z.string().min(1).max(500),
 originalText:z.string().min(1).max(150000),
 suggestedText:z.string().min(1).max(150000),
 explanation:z.object({en:z.string().min(1).max(2000),"zh-Hans":z.string().min(1).max(2000)}).strict(),
 confidence:z.number().min(0).max(1),
};
export const findingSchema=z.discriminatedUnion("reviewType",[
 z.object({...fields,reviewType:z.literal("correction"),category:z.enum(["spelling","grammar","punctuation","word_usage"]),optional:z.literal(false)}).strict(),
 z.object({...fields,reviewType:z.literal("enhancement"),category:z.enum(["simplify","clarity","student_accessibility","vocabulary_difficulty","instruction_clarity"]),optional:z.literal(true)}).strict(),
]);
export const reviewOutputSchema=z.object({findings:z.array(findingSchema).max(2000)}).strict();
export type ModelFinding=z.infer<typeof findingSchema>;
export type Finding=ModelFinding&{id:string};
export const reviewJsonSchema=z.toJSONSchema(reviewOutputSchema);
