import {zipSync,strToU8} from "fflate";
export const P="http://schemas.openxmlformats.org/presentationml/2006/main";
export const A="http://schemas.openxmlformats.org/drawingml/2006/main";
export const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const PKG="http://schemas.openxmlformats.org/package/2006/relationships";
export function shape(id:string,text:string){return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="Text '+id+'"/></p:nvSpPr><p:txBody>'+text+'</p:txBody></p:sp>';}
export function paragraph(text:string){return "<a:p><a:r><a:t>"+text+"</a:t></a:r></a:p>";}
export function slide(content:string,hidden=false){return '<p:sld xmlns:p="'+P+'" xmlns:a="'+A+'" xmlns:r="'+R+'"'+(hidden?' show="0"':"")+'><p:cSld><p:spTree>'+content+'</p:spTree></p:cSld></p:sld>';}
export function parts(slides=[slide(shape("2",paragraph("Test text")))],order?:number[]){
 const chosen=order??slides.map((_,i)=>i+1);
 const result:Record<string,string>={
 "[Content_Types].xml":'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>',
 "_rels/.rels":'<Relationships xmlns="'+PKG+'"><Relationship Id="root" Type="'+R+'/officeDocument" Target="ppt/presentation.xml"/></Relationships>',
 "ppt/presentation.xml":'<p:presentation xmlns:p="'+P+'" xmlns:r="'+R+'"><p:sldIdLst>'+chosen.map(i=>'<p:sldId id="'+(255+i)+'" r:id="s'+i+'"/>').join("")+'</p:sldIdLst></p:presentation>',
 "ppt/_rels/presentation.xml.rels":'<Relationships xmlns="'+PKG+'">'+slides.map((_,i)=>'<Relationship Id="s'+(i+1)+'" Type="'+R+'/slide" Target="slides/slide'+(i+1)+'.xml"/>').join("")+'</Relationships>',
 };
 slides.forEach((value,i)=>result["ppt/slides/slide"+(i+1)+".xml"]=value);
 return result;
}
export function archive(input:Record<string,string|Uint8Array>){return zipSync(Object.fromEntries(Object.entries(input).map(([key,value])=>[key,typeof value==="string"?strToU8(value):value]))).buffer as ArrayBuffer;}
export function fixture(slides?:string[],order?:number[]){return archive(parts(slides,order));}
