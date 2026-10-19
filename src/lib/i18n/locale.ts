export type AppLocale="en"|"zh-Hans";
// Best screen-reader language for a snippet of source text. Mixed content is
// marked "und" so a reader does not use one voice for the whole string.
export function textLanguage(text:string):"en"|"zh-Hans"|"und"{
 const cjk=/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(text);
 const latin=/[A-Za-z]/.test(text);
 if(cjk&&latin)return "und";
 if(cjk)return "zh-Hans";
 return "en";
}
export function resolveLocale(saved:string|null,languages:readonly string[]):AppLocale{
 if(saved==="en"||saved==="zh-Hans")return saved;
 for(const language of languages){
  if(/^en(?:-|$)/i.test(language))return "en";
  if(/^(zh|zh-CN|zh-SG|zh-Hans(?:-.*)?)$/i.test(language))return "zh-Hans";
 }
 return "en";
}
