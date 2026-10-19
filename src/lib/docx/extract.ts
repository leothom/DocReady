import {Inflate} from "fflate";
import {XMLParser,XMLValidator} from "fast-xml-parser";
import type {ExtractedDeck,Slide,TextElement} from "../contracts";

export const LIMITS={fileBytes:25*1024*1024,entries:5000,xmlPartBytes:5*1024*1024,xmlTotalBytes:50*1024*1024,paragraphs:5000,characters:150000};
const NS={
 w:["http://schemas.openxmlformats.org/wordprocessingml/2006/main","http://purl.oclc.org/ooxml/wordprocessingml/main"],
 r:["http://schemas.openxmlformats.org/officeDocument/2006/relationships","http://purl.oclc.org/ooxml/officeDocument/relationships"],
 pkg:["http://schemas.openxmlformats.org/package/2006/relationships"],
};
type Node={name:string;uri:string;attrs:Record<string,string>;ns:Record<string,string>;children:Node[];text:string};
type Raw=Record<string,unknown>;
function fail(code:string):never{throw new Error(code);}
const decoder=new TextDecoder("utf-8",{fatal:true});
function safePath(path:string){
 if(!path||path.startsWith("/")||path.includes("\\")||/[\x00-\x1f:%?#]/.test(path)||path.split("/").some(x=>x==="."||x==="..")) fail("UNSAFE_PACKAGE");
 return path;
}
function readPackage(data:ArrayBuffer){
 if(data.byteLength>LIMITS.fileBytes) fail("FILE_TOO_LARGE");
 const bytes=new Uint8Array(data);
 if(bytes[0]===208&&bytes[1]===207) fail("ENCRYPTED_OR_LEGACY");
 if(bytes.length<22||bytes[0]!==80||bytes[1]!==75) fail("INVALID_FILE");
 const view=new DataView(data),u16=(p:number)=>view.getUint16(p,true),u32=(p:number)=>view.getUint32(p,true);
 let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--) if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}
 if(end<0) fail("INVALID_FILE");
 if(u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10)) fail("INVALID_FILE");
 const count=u16(end+10),central=u32(end+16);
 if(count>LIMITS.entries) fail("TOO_MANY_ENTRIES");
 if(central+u32(end+12)!==end) fail("INVALID_FILE");
 const files=new Map<string,string>();const names=new Set<string>();
 let position=central,total=0;
 const ranges:{start:number;end:number}[]=[];
 for(let i=0;i<count;i++){
  if(position+46>end||u32(position)!==0x02014b50) fail("INVALID_FILE");
  const flags=u16(position+8),method=u16(position+10),size=u32(position+20),nameSize=u16(position+28),extra=u16(position+30),comment=u16(position+32),offset=u32(position+42);
  if(position+46+nameSize+extra+comment>end) fail("INVALID_FILE");
  const name=safePath(decoder.decode(bytes.subarray(position+46,position+46+nameSize)));
  if(names.has(name)) fail("UNSAFE_PACKAGE");names.add(name);
  if(flags&1) fail("ENCRYPTED_OR_LEGACY");
  if(offset+30>central||u32(offset)!==0x04034b50) fail("INVALID_FILE");
  const localName=u16(offset+26),start=offset+30+localName+u16(offset+28);
  if(start+size>central||u16(offset+6)!==flags||u16(offset+8)!==method||
    decoder.decode(bytes.subarray(offset+30,offset+30+localName))!==name) fail("INVALID_FILE");
  ranges.push({start:offset,end:start+size});
  if(name.endsWith(".xml")||name.endsWith(".rels")){
   if(method!==0&&method!==8) fail("INVALID_FILE");
   let expanded=0;const chunks:Uint8Array[]=[];
   const receive=(chunk:Uint8Array)=>{
    expanded+=chunk.byteLength;total+=chunk.byteLength;
    if(expanded>LIMITS.xmlPartBytes) fail("XML_TOO_LARGE");
    if(total>LIMITS.xmlTotalBytes) fail("XML_TOTAL_TOO_LARGE");
    chunks.push(chunk.slice());
   };
   if(method===0) for(let p=start;p<start+size;p+=1024) receive(bytes.subarray(p,Math.min(p+1024,start+size)));
   else{
    const stream=new Inflate(receive);
    if(!size) fail("INVALID_FILE");
    for(let p=start;p<start+size;p+=1024) stream.push(bytes.subarray(p,Math.min(p+1024,start+size)),p+1024>=start+size);
   }
   if(expanded!==u32(position+24)) fail("INVALID_FILE");
   const all=new Uint8Array(expanded);let at=0;for(const chunk of chunks){all.set(chunk,at);at+=chunk.length;}
   let crc=0xffffffff;for(const byte of all){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
   if(((crc^0xffffffff)>>>0)!==u32(position+16)) fail("INVALID_FILE");
   const text=decoder.decode(all);
   if(/<!\s*(DOCTYPE|ENTITY)\b/i.test(text)) fail("UNSAFE_XML");
   files.set(name,text);
  }
  position+=46+nameSize+extra+comment;
 }
 if(position!==end) fail("INVALID_FILE");
 ranges.sort((a,b)=>a.start-b.start);
 for(let i=1;i<ranges.length;i++)if(ranges[i].start<ranges[i-1].end)fail("INVALID_FILE");
 return {files,names};
}
function xml(text:string):Node{
 if(XMLValidator.validate(text)!==true) fail("INVALID_XML");
 const entityText=text.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g,"").replace(/<!--[\s\S]*?-->/g,"");
 if(/&(?!(?:amp|lt|gt|apos|quot|#(?:[0-9]+|x[0-9a-fA-F]+));)/.test(entityText))fail("INVALID_XML");
 for(const match of entityText.matchAll(/&#(x[0-9a-fA-F]+|[0-9]+);/g)){
  const point=match[1].startsWith("x")?parseInt(match[1].slice(1),16):Number(match[1]);
  if(!(point===9||point===10||point===13||point>=32&&point<=0xd7ff||point>=0xe000&&point<=0xfffd||point>=0x10000&&point<=0x10ffff))fail("INVALID_XML");
 }
 const raw=new XMLParser({preserveOrder:true,ignoreAttributes:false,attributeNamePrefix:"",trimValues:false,parseTagValue:false,parseAttributeValue:false,processEntities:true,htmlEntities:true,maxNestedTags:128}).parse(text) as Raw[];
 function build(input:Raw[],inherited:Record<string,string>,depth:number):Node[]{
  if(depth>128) fail("INVALID_XML");
  return input.flatMap(item=>{
   const key=Object.keys(item).find(k=>k!==":@"&&k!=="#text"&&!k.startsWith("?")&&!k.startsWith("!"));
   if(!key) return [];
   const attrs=(item[":@"]??{}) as Record<string,string>,ns={...inherited};
   for(const [name,value] of Object.entries(attrs)){if(name==="xmlns")ns[""]=value;else if(name.startsWith("xmlns:"))ns[name.slice(6)]=value;}
   const split=key.split(":"),prefix=split.length>1?split[0]:"",name=split.at(-1)!;
   if(prefix&&!ns[prefix]) fail("INVALID_XML");
   const content=Array.isArray(item[key])?item[key] as Raw[]:[];
   return [{name,uri:ns[prefix]??"",attrs,ns,children:build(content,ns,depth+1),text:content.filter(x=>"#text" in x).map(x=>String(x["#text"])).join("")}];
  });
 }
 const nodes=build(raw,{},0);if(nodes.length!==1) fail("INVALID_XML");return nodes[0];
}
function is(node:Node,name:string,family:keyof typeof NS){return node.name===name&&NS[family].includes(node.uri);}
function descendants(node:Node,name:string,family:keyof typeof NS):Node[]{
 return node.children.flatMap(child=>[...(is(child,name,family)?[child]:[]),...descendants(child,name,family)]);
}
function paragraphText(para:Node):string{
 function inline(node:Node):string{
  if(is(node,"t","w"))return node.text;
  if(is(node,"br","w"))return "\n";
  if(is(node,"tab","w"))return "\t";
  return node.children.map(inline).join("");
 }
 return para.children.map(inline).join("");
}
export function extractDocx(data:ArrayBuffer):ExtractedDeck{
 try{
  const {files,names}=readPackage(data);
  if(!files.has("[Content_Types].xml")||!files.has("word/document.xml")) fail("INVALID_DOCX");
  const document=xml(files.get("word/document.xml")!);
  if(!is(document,"document","w"))fail("INVALID_DOCX");
  const body=document.children.find(x=>is(x,"body","w"));
  if(!body)fail("INVALID_DOCX");
  const warnings:string[]=[];
  if([...names].some(n=>n.startsWith("word/header")||n.startsWith("word/footer")))warnings.push("HEADERS_FOOTERS_SKIPPED");
  if([...names].some(n=>n.startsWith("word/notes")||n.startsWith("word/endnotes")))warnings.push("NOTES_SKIPPED");
  let extractedCharacters=0;
  const paragraphs:TextElement[]=[];
  let paragraphIndex=0;
  function walk(node:Node,inTable?:{tableIndex:number;rowIndex:number;colIndex:number}){
   if(node.name==="AlternateContent"||node.name==="oMath"||node.name==="oMathPara")return;
   if(is(node,"p","w")){
    const text=paragraphText(node);
    if(text.trim()){
     const elementId=inTable?`para-${paragraphIndex}/table-${inTable.tableIndex}/row-${inTable.rowIndex}/cell-${inTable.colIndex}`:`para-${paragraphIndex}`;
     const shapeId=inTable?`table-${inTable.tableIndex}`:`para-${paragraphIndex}`;
     paragraphs.push({elementId,shapeId,shapeName:"",text,...(inTable?{tableCell:{row:inTable.rowIndex+1,column:inTable.colIndex+1}}:{})});
     paragraphIndex++;
    }
   }
   if(is(node,"tbl","w")){
    const tableIndex=paragraphs.filter(p=>p.shapeId.startsWith("table-")).length+1;
    node.children.filter(x=>is(x,"tr","w")).forEach((row,ri)=>{
     row.children.filter(x=>is(x,"tc","w")).forEach((cell,ci)=>{
      cell.children.filter(x=>is(x,"p","w")).forEach(p=>walk(p,{tableIndex,rowIndex:ri,colIndex:ci}));
     });
    });
    return;
   }
   for(const child of node.children)walk(child,inTable);
  }
  walk(body);
  if(paragraphs.length>LIMITS.paragraphs)fail("TOO_MANY_PARAGRAPHS");
  const count=paragraphs.reduce((n,e)=>n+e.text.length,0);
  if(count>LIMITS.characters)fail("TOO_MUCH_TEXT");
  extractedCharacters=count;
  const slide:Slide={slideNumber:1,hidden:false,elements:paragraphs,warnings,extractionStatus:paragraphs.length?"read":"empty"};
  return {slides:[slide],warnings:[],extractedCharacters};
 }catch(error){
  const code=error instanceof Error?error.message:"";
  if(["FILE_TOO_LARGE","ENCRYPTED_OR_LEGACY","INVALID_FILE","INVALID_DOCX","UNSAFE_PACKAGE","UNSAFE_XML","TOO_MANY_ENTRIES","XML_TOO_LARGE","XML_TOTAL_TOO_LARGE","TOO_MANY_PARAGRAPHS","TOO_MUCH_TEXT"].includes(code))throw error;
  fail("INVALID_FILE");
 }
}
