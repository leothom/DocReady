"use client";
import Link from 'next/link';
import LanguageSwitch from './language-switch';
import SiteFooter from './site-footer';
import {useLocale} from '../lib/i18n/provider';
import {siteContact} from '../lib/site-contact';
export default function InformationPage({kind}:{kind:'terms'|'contact'}){const {locale}=useLocale(),zh=locale==='zh-Hans';const sections=zh?[
 ['建议与教师审核','DocReady 提供 AI 语言建议，可能遗漏错误或给出不正确的建议。使用前请检查建议是否准确、是否保留教学内容的原意。建议并不保证课件准确、完整或适合某一学生水平。'],
 ['您的课件','PowerPoint 文件不会自动修改。请自行将需要的建议粘贴到 PowerPoint。您保留课件的权利。请仅提交您有权使用且学校允许发送至 AI 服务的文本。不要提交学生个人信息或其他敏感个人信息。'],
 ['私人试用','仅与获准参与试用的人员分享私人邀请。不要公开邀请链接，不要滥用服务。服务可能暂停或更改，并不保证始终可用。'],
 ['数据与责任','请阅读隐私政策，了解香港服务器和 DeepSeek 如何处理文本。条款不排除或限制依法不得排除或限制的权利或责任。具体责任取决于适用法律和实际情况。'],
]:[
 ['Suggestions and teacher review','DocReady provides AI language suggestions. It can miss errors or give incorrect suggestions. Check each suggestion before use and keep the teaching meaning. Suggestions do not guarantee that a lesson is accurate, complete or suitable for a student level.'],
 ['Your presentations','Your PowerPoint file is not changed automatically. Paste the suggestions you choose into PowerPoint. You keep your rights to your material. Submit only text you have permission to use and that your school permits you to send to the AI service. Do not submit student personal data or other sensitive personal data.'],
 ['Private trial','Share private invites only with people permitted to join the trial. Do not publish invite links or misuse the service. The service can change or pause. Continuous availability is not guaranteed.'],
 ['Data and responsibility','Read Privacy for how the Hong Kong server and DeepSeek handle text. These terms do not exclude or limit rights or liability that cannot legally be excluded or limited. Specific liability depends on applicable law and the facts.'],
];return <main className="privacy-page"><header><Link className="brand" href="/">DocReady</Link><LanguageSwitch/></header><h1>{kind==='terms'?(zh?'使用条款':'Terms of Use'):(zh?'联系':'Contact')}</h1>{kind==='terms'&&sections.map(([title,text])=><section key={title}><h2>{title}</h2><p>{text}</p></section>)}<section>{kind==='terms'&&<h2>{zh?'运营方与联系':'Operator and contact'}</h2>}<p>{siteContact.operator}</p><p>{zh?'如需帮助，请发送邮件：':'For help, send an email:'}</p><a href={'mailto:'+siteContact.email}>{siteContact.email}</a></section><SiteFooter/></main>;}
