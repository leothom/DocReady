"use client";
import SiteFooter from "./site-footer";
import {siteContact} from "../lib/site-contact";
import Link from "next/link";
import LanguageSwitch from "./language-switch";
import {useLocale} from "../lib/i18n/provider";
import {getMessages} from "../lib/i18n/messages";
export default function PrivacyPolicy(){const {locale}=useLocale(),w=getMessages(locale);return <main className="privacy-page">
 <header><Link className="brand" href="/">DocReady</Link><LanguageSwitch/></header>
 <h1>{w.privacyTitle}</h1>
 <section><h2>{w.privacyFiles}</h2><p>{w.privacy}</p></section>
 <section><h2>{w.privacySession}</h2><p>{w.sessionHelp}</p><p>{w.privacyFeedback}</p><p>{w.privacyAccess}</p></section>
 <section><h2>{locale==='en'?'Personal DeepSeek keys':'个人 DeepSeek 密钥'}</h2><p>{locale==='en'?'If you choose to save your own API key, DocReady stores it in this browser on this device until you remove it or clear this site’s browser data. It is not linked to your email profile. Anyone using the same browser profile can use it. Save keys only on your own computer.':'如果您选择保存自己的 API 密钥，DocReady 会将其保存在此设备的浏览器中，直到您移除密钥或清除此网站的浏览器数据。密钥不会与邮箱资料关联。使用同一浏览器配置的其他人也可以使用它。请仅在自己的电脑上保存密钥。'}</p><p>{locale==='en'?'Your key passes through the Hong Kong server to DeepSeek over HTTPS for connection tests and reviews. DocReady does not save it on the server or include it in usage records or logs. Browser storage is not a secure vault: malicious code on this site or access to your browser profile could expose it. Personal-key failures do not switch to the school account.':'连接测试和审核时，您的密钥会通过 HTTPS 经香港服务器传送至 DeepSeek。DocReady 不会在服务器上保存密钥，也不会将其写入使用记录或日志。浏览器存储不是安全保险库：网站上的恶意代码或对浏览器配置的访问可能导致密钥泄露。个人密钥失败时不会切换至学校账户。'}</p></section>
 <section><h2>{w.privacyOperations}</h2><p>{w.privacyOperationsText}</p></section>
 <section><h2>{locale==='en'?'Approved school emails':'已批准的学校邮箱'}</h2><p>{locale==='en'?'DocReady stores approved school email addresses and their access profiles in its private database. It uses the address you enter to grant access and record usage totals. It does not send a verification email or check that you own the address. These records identify an address or access profile, not a verified person.':'DocReady 在私有数据库中保存已批准的学校邮箱及其访问资料。系统使用您输入的邮箱授予访问权限并记录使用总量。系统不会发送验证邮件，也不会验证邮箱归属。这些记录对应邮箱或访问资料，不代表已验证身份的个人。'}</p><p>{locale==='en'?'Approved emails remain until the administrator removes or deletes them. Removing approval stops access. Deleting an email profile also removes its identifying history. Email addresses are not sent to DeepSeek with slide text. Contact Leo to ask about access or deletion.':'已批准的邮箱保留至管理员移除或删除。移除批准会停止访问。删除邮箱资料也会删除其身份关联记录。邮箱地址不会随幻灯片文本发送给 DeepSeek。如需咨询访问权限或删除记录，请联系 Leo。'}</p></section>
 <section><h2>{locale==='en'?'Invite usage records':'邀请使用记录'}</h2><p>{locale==='en'?'The administrator assigns a name to each invite. DocReady records review dates, slide counts, request outcomes, token totals and estimated AI cost for that code. A forwarded link counts under the same name. These totals show activity, not teaching quality.':'管理员为每个邀请设置名称。DocReady 记录该邀请码的审核日期、幻灯片数量、请求结果、词元总量和 AI 费用估算。转发链接后的使用仍计入同一名称。这些总量反映使用情况，不代表教学质量。'}</p><p>{locale==='en'?'Daily totals are kept for 365 days and individual request records for 30 days. Invite names remain until the administrator deletes them. File names, slide text and suggestions are not stored in these records. Contact Leo to ask about your records. DeepSeek’s own data policy also applies.':'每日总量保留 365 天，单次请求记录保留 30 天。邀请名称保留至管理员删除。记录中不保存文件名、幻灯片文本或建议。如需了解您的记录，请联系 Leo。DeepSeek 自身的数据政策也适用。'}</p></section>
 <section><h2>{locale==="en"?"Operator and contact":"运营方与联系"}</h2><p>{siteContact.operator}</p><a href={"mailto:"+siteContact.email}>{siteContact.email}</a></section>
 <SiteFooter/>
 </main>;}
