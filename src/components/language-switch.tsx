"use client";
import {GlobeIcon} from "@radix-ui/react-icons";
import {useLocale} from "../lib/i18n/provider";
import {getMessages} from "../lib/i18n/messages";
export default function LanguageSwitch(){
 const {locale,setLocale}=useLocale();
 return <label className="language-label"><GlobeIcon className="language-globe" aria-hidden="true"/><span className="sr-only">{getMessages(locale).language}</span><select data-testid="language" value={locale} onChange={e=>setLocale(e.target.value as "en"|"zh-Hans")}><option value="en">English</option><option value="zh-Hans">简体中文</option></select></label>;
}
