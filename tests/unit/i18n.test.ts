import {it,expect} from "vitest";
import {en,zh,errors,warningMessages} from "../../src/lib/i18n/messages";
import {resolveLocale} from "../../src/lib/i18n/locale";
it("keeps the same catalog keys and placeholders",()=>{
 expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
 for(const key of Object.keys(en) as (keyof typeof en)[]){
  const placeholders=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  expect(placeholders(zh[key])).toEqual(placeholders(en[key]));
 }
 expect(en).toHaveProperty("coverage");expect(en).toHaveProperty("replaceTitle");expect(en).toHaveProperty("copyFailed");
});
it.each([
 ["en",["zh-CN"],"en"],["zh-Hans",["en"],"zh-Hans"],[null,["zh-CN"],"zh-Hans"],
 [null,["zh-SG"],"zh-Hans"],[null,["zh-Hans-CN"],"zh-Hans"],[null,["zh-TW","en"],"en"],
 ["bad",["zh"],"zh-Hans"],[null,["fr","en"],"en"],[null,["fr"],"en"],
] as const)("resolves %s and %s", (saved,languages,wanted)=>expect(resolveLocale(saved,languages)).toBe(wanted));
it("has both translations for every review error and coverage warning",()=>{
 for(const code of ["CANCELLED","EXTRACTION_FAILED","MODEL_REQUEST_REJECTED","INVALID_MODEL_OUTPUT","NOT_CONFIGURED","MODEL_TIMEOUT","MODEL_UNAVAILABLE","INVITE_REQUIRED","INVALID_RETRY"])
  expect(errors[code]?.["zh-Hans"]).toBeTruthy();
 expect(warningMessages.NO_EDITABLE_TEXT?.["zh-Hans"]).toBeTruthy();
});
