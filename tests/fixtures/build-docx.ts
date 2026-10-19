import {deflateSync} from "fflate";
import {createHash} from "node:crypto";

const documentXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>Hello world. This is a test document.</w:t></w:r></w:p>
<w:p><w:r><w:t>The company sell goods. Its manager approve the orders.</w:t></w:r></w:p>
<w:p><w:r><w:t>This paragraph has no errors.</w:t></w:r></w:p>
<w:tbl>
<w:tr>
<w:tc><w:p><w:r><w:t>Cell one with eror.</w:t></w:r></w:p></w:tc>
<w:tc><w:p><w:r><w:t>Cell two is fine.</w:t></w:r></w:p></w:tc>
</w:tr>
</w:tbl>
</w:body>
</w:document>`;

const contentTypesXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

function crc32(data:Uint8Array):number{
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}

function zipEntry(name:string,content:string){
 const nameBytes=new TextEncoder().encode(name);
 const contentBytes=new TextEncoder().encode(content);
 const compressed=deflateSync(contentBytes);
 const crc=crc32(contentBytes);
 return {nameBytes,contentBytes,compressed,crc,uncompressedSize:contentBytes.length};
}

export function buildTestDocx():ArrayBuffer{
 const entries=[
  zipEntry("[Content_Types].xml",contentTypesXml),
  zipEntry("word/document.xml",documentXml),
 ];
 const localHeaders:Uint8Array[]=[];
 const centralHeaders:Uint8Array[]=[];
 let offset=0;
 for(const entry of entries){
  const local=new Uint8Array(30+entry.nameBytes.length+entry.compressed.length);
  const view=new DataView(local.buffer);
  view.setUint32(0,0x04034b50,true);
  view.setUint16(4,20,true);
  view.setUint16(6,8,true);
  view.setUint16(8,8,true);
  view.setUint32(14,entry.crc,true);
  view.setUint32(18,entry.compressed.length,true);
  view.setUint32(22,entry.uncompressedSize,true);
  view.setUint16(26,entry.nameBytes.length,true);
  local.set(entry.nameBytes,30);
  local.set(entry.compressed,30+entry.nameBytes.length);
  localHeaders.push(local);
  const central=new Uint8Array(46+entry.nameBytes.length);
  const cview=new DataView(central.buffer);
  cview.setUint32(0,0x02014b50,true);
  cview.setUint16(4,20,true);
  cview.setUint16(6,20,true);
  cview.setUint16(8,8,true);
  cview.setUint16(10,8,true);
  cview.setUint32(16,entry.crc,true);
  cview.setUint32(20,entry.compressed.length,true);
  cview.setUint32(24,entry.uncompressedSize,true);
  cview.setUint16(28,entry.nameBytes.length,true);
  cview.setUint32(42,offset,true);
  central.set(entry.nameBytes,46);
  centralHeaders.push(central);
  offset+=local.length;
 }
 const centralOffset=offset;
 let centralSize=0;
 for(const c of centralHeaders)centralSize+=c.length;
 const end=new Uint8Array(22);
 const eview=new DataView(end.buffer);
 eview.setUint32(0,0x06054b50,true);
 eview.setUint16(8,entries.length,true);
 eview.setUint16(10,entries.length,true);
 eview.setUint32(12,centralSize,true);
 eview.setUint32(16,centralOffset,true);
 const parts=[...localHeaders,...centralHeaders,end];
 const total=parts.reduce((n,p)=>n+p.length,0);
 const result=new Uint8Array(total);
 let at=0;
 for(const part of parts){result.set(part,at);at+=part.length;}
 return result.buffer;
}
