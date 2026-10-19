import type {AppLocale} from "./locale";
export type Locale=AppLocale;
export const en={
 previousSlide:"Previous",nextSlide:"Next",slidePosition:"{current} of {total} paragraphs to review",manualCopy:"Paste the suggested text into Word. Your file is not changed automatically.",anotherFile:"Review another file",anotherPrompt:"Need to review another document?",

 privacyAccess:"A secure cookie keeps private access active for up to seven days. It contains no lesson text. The original file, file name, images, speaker notes and document metadata are not sent to the AI service.",
 settingsTitle:"Subject and TOEFL level (optional)",dropFile:"Drop a Word here",changeFile:"Change file",oneFile:"Choose one Word file at a time.",privacyTitle:"Privacy",privacyNotice:"Slide text is sent to DeepSeek for review.",privacyFiles:"Files and paragraph text",privacySession:"Your session",privacyOperations:"Server and AI service",privacyOperationsText:"DocReady runs on a Hong Kong server. The server handles extracted text in memory and does not write paragraph text or results to files or logs. The server stores its settings, secrets and HTTPS certificates. It keeps limited operational logs. DeepSeek is a separate service; its data policy applies. This is not a promise that no data is stored anywhere.",privacyFeedback:"Your language choice and any personal DeepSeek key you choose to save are kept in this browser.",

 fileReadyOne:"Read {count} paragraphs locally.",suggestionsOne:"{count} suggestion",coverageOne:"{reviewed} paragraph reviewed. {failed} failed. {skipped} had no editable text. {cancelled} stopped.",
 settingsChanged:"Settings changed. Start a new review.",reviewSettings:"Reviewed as {subject}, TOEFL {level}.",
 language:"Language",pageTitle:"DocReady | Slide review",tagline:"Better wording for better lessons.",
 title:"Better wording for better lessons.",intro:"Suggestions for spelling, grammar and clear teaching content.",
 subject:"Subject (optional)",subjectPlaceholder:"General review",toefl:"Student TOEFL level",toeflHelp:"Broad guidance only. 1–6, in steps of 0.5.",
 choose:"Choose file",fileLimit:"DOCX only. Up to 25 MiB and 150 paragraphs.",fileReady:"Read {count} paragraphss locally.",chooseFirst:"Choose a DOCX file to start.",
 start:"Review document",cancel:"Cancel",reset:"Clear document",retry:"Retry failed batches",restart:"Review document again",
 reading:"Reading document…",reviewing:"Reviewing document…",preparing:"Preparing recommendations…",progress:"{done} of {total} batches finished. {failed} failed.",
 stoppedReading:"Reading stopped.",reviewComplete:"Review is complete.",reviewPartial:"Review is incomplete.",reviewFailed:"Review could not finish.",reviewCancelled:"Review stopped.",
 coverage:"{reviewed} paragraphs reviewed. {failed} failed. {skipped} had no editable text. {cancelled} stopped.",
 coverageHelp:"Only editable paragraph text is reviewed. Images, notes, charts and other skipped content need a separate check.",
 noText:"No editable text was found. No text was sent for review.",noFindings:"No suggestions were found in the reviewed text.",
 incompleteHelp:"Some paragraphs were not reviewed. This result does not show that all paragraphs are correct.",
 suggestions:"{count} suggestions",slide:"Paragraph {number}",read:"Reviewed",failed:"Failed",skipped:"No editable text",cancelled:"Stopped",hidden:"Hidden paragraph",
 correction:"Correction",enhancement:"Optional enhancement",original:"Original text",suggestion:"Suggested English",explanation:"Reason",
 accept:"Accept",ignore:"Ignore",undo:"Undo",copy:"Copy suggested text",accepted:"Accepted",ignored:"Ignored",pending:"Not decided",
 acceptHelp:"Accept keeps this suggestion in this session. It does not change your Word.",
 copied:"Text copied.",copyFailed:"Could not copy. Select the suggested text and copy it.",
 privacy:"Your Word file stays on your computer. Extracted paragraph text goes through the DocReady server to DeepSeek. DocReady does not save your paragraph text or results. DeepSeek’s data policy applies.",
 sessionHelp:"Slide text, results and review settings stay in memory until you clear the review or leave this page.",
 warnings:"Content not reviewed",preview:"See the text read from the file",download:"Download feedback",feedbackTitle:"DocReady feedback",
 feedbackHelp:"The feedback file contains counts and timings. It contains no lesson text or file name. It is downloaded to your computer.",
 downloadFailed:"Could not download the feedback file. Try again.",metrics:"Review details",time:"Review time: {seconds} s",tokens:"Tokens: {input} input / {output} output",retries:"Automatic retries: {count}",cost:"Estimated cost: {value}",unknown:"Unknown",
 invalidSubject:"Choose a subject before review.",invalidToefl:"Use a TOEFL value from 1 to 6 in steps of 0.5.",
 replaceTitle:"Replace this review?",replaceHelp:"This clears the current paragraph text and suggestions.",replace:"New DOCX",keep:"Keep current review",
 access:"Checking your invite…",invite:"Open your private invite link to start.",notFound:"Page not found.",appError:"The page could not load.",returnHome:"Open DocReady",tryAgain:"Try again",
};
export type Messages={[K in keyof typeof en]:string};
export const zh:Messages={
 previousSlide:"上一张",nextSlide:"下一张",slidePosition:"需查看 {total} 段中的第 {current} 张",manualCopy:"请将建议文本粘贴到 Word。文件不会自动修改。",anotherFile:"审查另一个文件",anotherPrompt:"需要审查另一份课件？",

 privacyAccess:"安全 Cookie 用于维持私人访问权限，最长七天，不包含课件文本。原始文件、文件名、图片、演讲者备注和文档元数据不会发送至 AI 服务。",
 settingsTitle:"学科和 TOEFL 水平（可选）",dropFile:"将 Word 文件拖到这里",changeFile:"更换文件",oneFile:"请每次选择一个 Word 文件。",privacyTitle:"隐私政策",privacyNotice:"段落文本将发送至 DeepSeek 进行审查。",privacyFiles:"文件与段落文本",privacySession:"本次使用",privacyOperations:"服务器与 AI 服务",privacyOperationsText:"DocReady 运行于香港服务器。服务器在内存中处理提取的文本，不将段落文本或结果写入文件或日志。服务器保存设置、密钥和 HTTPS 证书，并保留有限的运行日志。DeepSeek 是独立服务，其数据政策适用。这并不表示任何地方都不会存储数据。",privacyFeedback:"浏览器保存您的语言选择，以及您选择保存的个人 DeepSeek 密钥。",

 fileReadyOne:"已在本机读取 {count} 张段落。",suggestionsOne:"{count} 条建议",coverageOne:"已审查 {reviewed} 张；失败 {failed} 张；无可编辑文本 {skipped} 张；已停止 {cancelled} 张。",
 settingsChanged:"设置已更改，请开始新的审查。",reviewSettings:"本次审查：学科 {subject}，TOEFL {level}。",
 language:"语言",pageTitle:"DocReady | 英语审查",tagline:"优化措辞，让教学更有效。",
 title:"优化措辞，让教学更有效。",intro:"提供拼写、语法和教学内容清晰度建议。",
 subject:"学科（可选）",subjectPlaceholder:"通用审查",toefl:"学生 TOEFL 水平",toeflHelp:"仅提供大致指导。取值 1–6，间隔 0.5。",
 choose:"选择文件",fileLimit:"仅支持 DOCX。最多 25 MiB、150 张段落。",fileReady:"已在本机读取 {count} 张段落。",chooseFirst:"请选择 DOCX 文件以开始。",
 start:"审查段落",cancel:"取消",reset:"清除段落",retry:"重试失败批次",restart:"重新审查全部段落",
 reading:"正在读取段落…",reviewing:"正在审查段落…",preparing:"正在准备建议…",progress:"已完成 {done} / {total} 个批次，其中 {failed} 个失败。",
 stoppedReading:"已停止读取。",reviewComplete:"审查已完成。",reviewPartial:"审查未完成。",reviewFailed:"无法完成审查。",reviewCancelled:"审查已停止。",
 coverage:"已审查 {reviewed} 张；失败 {failed} 张；无可编辑文本 {skipped} 张；已停止 {cancelled} 张。",
 coverageHelp:"仅审查段落中可编辑的文本。图片、备注、图表及其他未读取的内容需要单独检查。",
 noText:"未找到可编辑文本。未发送任何文本进行审查。",noFindings:"已审查文本中没有建议。",
 incompleteHelp:"部分段落尚未审查。此结果不能说明所有段落都正确。",
 suggestions:"{count} 条建议",slide:"段落 {number}",read:"已审查",failed:"失败",skipped:"无可编辑文本",cancelled:"已停止",hidden:"隐藏段落",
 correction:"纠错",enhancement:"可选优化",original:"原始文本",suggestion:"英语建议文本",explanation:"原因",
 accept:"接受",ignore:"忽略",undo:"撤销",copy:"复制建议文本",accepted:"已接受",ignored:"已忽略",pending:"未决定",
 acceptHelp:"接受仅在本次使用中保留此建议，不会修改 Word 文件。",
 copied:"文本已复制。",copyFailed:"无法复制。请选中建议文本后复制。",
 privacy:"Word 文件保留在本机。提取的段落文本经 DocReady 服务器发送至 DeepSeek。DocReady 不保存段落文本或结果。DeepSeek 的数据政策适用。",
 sessionHelp:"段落文本、结果和审查设置仅保留在内存中，直到清除审查或离开此页面。",
 warnings:"未审查的内容",preview:"查看从文件读取的文本",download:"下载反馈",feedbackTitle:"DocReady 反馈",
 feedbackHelp:"反馈文件包含数量和用时，不包含课件文本或文件名，并下载至本机。",
 downloadFailed:"无法下载反馈文件，请重试。",metrics:"审查详情",time:"审查用时：{seconds} 秒",tokens:"词元：输入 {input} / 输出 {output}",retries:"自动重试：{count} 次",cost:"估算费用：{value}",unknown:"未知",
 invalidSubject:"请先选择学科再开始审查。",invalidToefl:"TOEFL 取值为 1 至 6，间隔为 0.5。",
 replaceTitle:"替换当前审查？",replaceHelp:"此操作将清除当前段落文本和建议。",replace:"新 DOCX",keep:"保留当前审查",
 access:"正在检查邀请…",invite:"请打开私人邀请链接以开始。",notFound:"找不到页面。",appError:"页面无法加载。",returnHome:"打开 DocReady",tryAgain:"重试",
};
export const subjects={Business:{en:"Business","zh-Hans":"商科"},Economics:{en:"Economics","zh-Hans":"经济学"},English:{en:"English","zh-Hans":"英语"},Mathematics:{en:"Mathematics","zh-Hans":"数学"},Science:{en:"Science","zh-Hans":"科学"},Humanities:{en:"Humanities","zh-Hans":"人文学科"},Other:{en:"Other","zh-Hans":"其他"}};
export const categories={
 spelling:{en:"Spelling","zh-Hans":"拼写"},grammar:{en:"Grammar","zh-Hans":"语法"},punctuation:{en:"Punctuation","zh-Hans":"标点"},word_usage:{en:"Word use","zh-Hans":"词语用法"},
 simplify:{en:"Simpler wording","zh-Hans":"简化措辞"},clarity:{en:"Clarity","zh-Hans":"表达清晰度"},student_accessibility:{en:"Student access","zh-Hans":"便于学生理解"},vocabulary_difficulty:{en:"Vocabulary support","zh-Hans":"词汇支持"},instruction_clarity:{en:"Clear instructions","zh-Hans":"指令清晰度"},
};
export const errors:Record<string,{en:string;"zh-Hans":string}>={
 DOCX_ONLY:{en:"Choose a DOCX file.", "zh-Hans":"请选择 DOCX 文件。"},
 FILE_TOO_LARGE:{en:"The file exceeds 25 MiB.", "zh-Hans":"文件超过 25 MiB。"},
 INVALID_FILE:{en:"The file is damaged or is not a supported Word file.", "zh-Hans":"文件已损坏或不是支持的 Word 文件。"},
 INVALID_DOCX:{en:"The file does not contain a supported Word document.", "zh-Hans":"文件中没有支持的 Word 演示文稿。"},
 ENCRYPTED_OR_LEGACY:{en:"Use an unencrypted DOCX file. Old PPT files are not supported.", "zh-Hans":"请使用未加密的 DOCX 文件。不支持旧版 PPT 文件。"},
 UNSAFE_PACKAGE:{en:"The file has unsafe or duplicate internal paths.", "zh-Hans":"文件包含不安全或重复的内部路径。"},
 UNSAFE_XML:{en:"The file contains an unsupported XML declaration.", "zh-Hans":"文件包含不支持的 XML 声明。"},
 TOO_MANY_ENTRIES:{en:"The file has too many internal parts.", "zh-Hans":"文件的内部部分过多。"},
 XML_TOO_LARGE:{en:"One text part is too large to read safely.", "zh-Hans":"一个文本部分过大，无法安全读取。"},
 XML_TOTAL_TOO_LARGE:{en:"The expanded text parts exceed the reading limit.", "zh-Hans":"解压后的文本部分超过读取限制。"},
 TOO_MANY_SLIDES:{en:"The file exceeds 150 paragraphs.", "zh-Hans":"文件超过 150 张段落。"},
 TOO_MUCH_TEXT:{en:"The file exceeds 150,000 text characters.", "zh-Hans":"文件文本超过 150,000 个字符。"},
 READ_FAILED:{en:"Could not read the file. Choose it again.", "zh-Hans":"无法读取文件。请重新选择。"},
 INVITE_REQUIRED:{en:"Open your private invite link.", "zh-Hans":"请打开私人邀请链接。"},
 RESULT_UNAVAILABLE:{en:"This request was already sent. Its result is no longer available. Retry this batch to send a new request.","zh-Hans":"此请求已发送，结果已无法获取。请重试此批次以发送新请求。"},
 DAILY_LIMIT:{en:"The daily review limit was reached. Try again tomorrow or contact Leo.","zh-Hans":"已达到每日审查限额。请明天再试或联系 Leo。"},
 NOT_CONFIGURED:{en:"The server setup is not complete.", "zh-Hans":"服务器配置尚未完成。"},
 MODEL_ACCESS_FAILED:{en:"Check the API key and account balance on the server.", "zh-Hans":"请在服务器检查 API 密钥和账户余额。"},
 MODEL_UNAVAILABLE:{en:"The AI service is unavailable. Try again later.", "zh-Hans":"AI 服务不可用。请稍后重试。"},
 MODEL_TIMEOUT:{en:"The AI service did not respond in time.", "zh-Hans":"AI 服务响应超时。"},
 INVALID_MODEL_OUTPUT:{en:"The AI result did not pass the check.", "zh-Hans":"AI 结果未通过检查。"},
 TOO_MANY_REQUESTS:{en:"Wait one minute, then try again.", "zh-Hans":"请等待一分钟后重试。"},
 ACCESS_DENIED:{en:"Access was denied.", "zh-Hans":"访问被拒绝。"},
 INVALID_REQUEST:{en:"The request could not be used.", "zh-Hans":"请求无法使用。"},
};
export const warningMessages:Record<string,{en:string;"zh-Hans":string}>={
 NOTES_SKIPPED:{en:"Speaker notes", "zh-Hans":"演讲者备注"},
 INHERITED_TEXT_SKIPPED:{en:"Text from paragraph styles and layouts", "zh-Hans":"样式和模板中的文本"},
 IMAGES_SKIPPED:{en:"Images and text in images", "zh-Hans":"图片和图片中的文本"},
 OBJECTS_SKIPPED:{en:"Embedded objects", "zh-Hans":"嵌入对象"},
 CHARTS_SKIPPED:{en:"Charts", "zh-Hans":"图表"},
 SMARTART_SKIPPED:{en:"SmartArt", "zh-Hans":"SmartArt"},
 EQUATIONS_OR_ALTERNATE_SKIPPED:{en:"Equations or alternate content", "zh-Hans":"公式或替代内容"},
 UNREADABLE_SLIDE:{en:"Unreadable paragraph content", "zh-Hans":"无法读取的段落内容"},
 EXTERNAL_LINKS_SKIPPED:{en:"External links", "zh-Hans":"外部链接"},
};

Object.assign(errors,{
 PERSONAL_KEY_INVALID:{en:"Enter a valid DeepSeek API key, or remove the saved key to use the school account.","zh-Hans":"请输入有效的 DeepSeek API 密钥，或移除已保存的密钥以使用学校账户。"},
 PERSONAL_KEY_FAILED:{en:"Check your DeepSeek key and account balance. The school account was not used.","zh-Hans":"请检查您的 DeepSeek 密钥和账户余额。未使用学校账户。"},
 ACCOUNT_CHANGED:{en:"The DeepSeek account changed. Start a new review.","zh-Hans":"DeepSeek 账户已更改。请开始新的审查。"},
 KEY_STORAGE_UNAVAILABLE:{en:"Browser storage is unavailable. Allow site storage and reload this page.","zh-Hans":"浏览器存储不可用。请允许网站存储并重新加载此页面。"},
 KEY_SAVE_FAILED:{en:"Could not save the key on this device. Your current account setting has not changed.","zh-Hans":"无法在此设备上保存密钥。当前账户设置未更改。"},
 KEY_REMOVE_FAILED:{en:"Could not remove the saved key. Clear this site’s browser data before using a shared computer.","zh-Hans":"无法移除已保存的密钥。使用共用电脑前，请清除此网站的浏览器数据。"},
 REQUEST_TOO_LARGE:{en:"The review text exceeds the request limit.","zh-Hans":"请求文本超过审查限制。"},
 METHOD_NOT_ALLOWED:{en:"This action is not available.","zh-Hans":"此操作不可用。"},
 CANCELLED:{en:"Review stopped.","zh-Hans":"审查已停止。"},
 EXTRACTION_FAILED:{en:"The paragraph text could not be read.","zh-Hans":"无法读取此段落的文本。"},
 MODEL_REQUEST_REJECTED:{en:"The AI service could not use this request.","zh-Hans":"AI 服务无法处理此请求。"},
 INVALID_RETRY:{en:"The file or settings changed. Start a new review.","zh-Hans":"文件或设置已更改，请开始新的审查。"},
 REVIEW_FAILED:{en:"The review could not finish. Try again.","zh-Hans":"无法完成审查，请重试。"},
});
warningMessages.NO_EDITABLE_TEXT={en:"No editable text","zh-Hans":"无可编辑文本"};
export function getMessages(locale:AppLocale):Messages{return locale==="en"?en:zh;}
export function format(text:string,values:Record<string,string|number>){return text.replace(/\{(\w+)\}/g,(_,key)=>String(values[key]??""));}
export function errorMessage(code:string,locale:AppLocale){return (errors[code]??errors.REVIEW_FAILED)[locale];}
export function warningMessage(code:string,locale:AppLocale){return (warningMessages[code]??{en:"Other skipped content","zh-Hans":"其他未读取内容"})[locale];}
