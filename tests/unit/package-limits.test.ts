import {it,expect} from "vitest";
import {extractDocx,LIMITS} from "../../src/lib/docx/extract";
import {parts,archive} from "../fixtures/build-pptx";
it("rejects duplicate ZIP paths",()=>{
 const bytes=new Uint8Array(archive({...parts(),"a.xml":"<x/>","b.xml":"<x/>"}));
 for(let i=0;i<bytes.length-5;i++)if(bytes[i]===98&&bytes[i+1]===46&&bytes[i+2]===120&&bytes[i+3]===109&&bytes[i+4]===108)bytes[i]=97;
 expect(()=>extractDocx(bytes.buffer)).toThrow("UNSAFE_PACKAGE");
});
it("counts expanded bytes despite a misleading original size header",()=>{
 const bytes=new Uint8Array(archive({...parts(),"bomb.xml":"x".repeat(LIMITS.xmlPartBytes+100)}));const view=new DataView(bytes.buffer);
 for(let i=0;i<bytes.length-46;i++)if(view.getUint32(i,true)===0x02014b50&&new TextDecoder().decode(bytes.subarray(i+46,i+54))==="bomb.xml")view.setUint32(i+24,1,true);
 expect(()=>extractDocx(bytes.buffer)).toThrow("XML_TOO_LARGE");
});
it("enforces total expanded XML bytes across individual safe parts",()=>{
 const data=parts();for(let i=0;i<11;i++)data["extra"+i+".xml"]="x".repeat(5*1024*1024);
 expect(()=>extractDocx(archive(data))).toThrow("XML_TOTAL_TOO_LARGE");
});
