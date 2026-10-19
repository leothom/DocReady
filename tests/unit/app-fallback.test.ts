import {it,expect} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import AppFallback from "../../src/components/app-fallback";
import {LocaleContext} from "../../src/lib/i18n/provider";
import {getMessages} from "../../src/lib/i18n/messages";
it.each(["en","zh-Hans"] as const)("localizes safe app error and not-found pages in %s",locale=>{
 const w=getMessages(locale);
 for(const kind of ["error","notFound"] as const){
  const html=renderToStaticMarkup(createElement(LocaleContext.Provider,{value:{locale,setLocale:()=>{}}},createElement(AppFallback,{kind,retry:()=>{}})));
  expect(html).toContain(kind==="error"?w.appError:w.notFound);expect(html).toContain(w.tryAgain);expect(html).toContain(w.returnHome);
  expect(html).not.toContain("stack");expect(html).not.toContain("digest");
 }
});
