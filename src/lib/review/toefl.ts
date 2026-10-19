// Broad context from ETS's 2026 test specification and score scale.
// This is support guidance for the app, not a claim of exact reading ability.
export const TOEFL_SOURCES=[
 "https://www.eu.ets.org/toefl/institutions/ibt/score-scale-update.html",
 "https://www.eu.ets.org/pdfs/toefl/toefl-enki-test-specifications-2026.pdf",
];
export function toeflContext(level:number):string {
 if(!Number.isFinite(level)||level<1||level>6||!Number.isInteger(level*2))throw new Error("INVALID_SETTINGS");
 const context=level<=2.5?
  "Broad basic context: familiar words, simple phrases, short texts and clear references may need support. Retain the subject's required terms and explain them when useful.":
  level<=4.5?
  "Broad independent context: students may follow main ideas and supporting details in moderately complex texts. Offer support for dense instructions, unfamiliar language and unclear references when useful.":
  "Broad proficient context: students may work with complex academic texts and connect information across a text. Keep useful academic complexity; improve wording only when there is a clear benefit.";
 return "Selected TOEFL level: "+level.toFixed(1)+". "+context+" An overall TOEFL score is not an exact reading ability measure. It combines four skill scores. Do not infer that a word or sentence is objectively above this level. Use cautious language: may need support.";
}
