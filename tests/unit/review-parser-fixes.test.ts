import {it,expect} from "vitest";
import {extractDocx} from "../../src/lib/docx/extract";
import {archive,parts,fixture,paragraph,shape,slide} from "../fixtures/build-pptx";
const alternate='<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice><a:r><a:t>Choice</a:t></a:r></mc:Choice><mc:Fallback><a:r><a:t>Fallback</a:t></a:r></mc:Fallback></mc:AlternateContent>';
it("skips an affected text box without merging or exposing partial text",()=>{
 const deck=extractDocx(fixture([slide(shape("2",'<a:p><a:r><a:t>Before </a:t></a:r>'+alternate+'<a:r><a:t> after</a:t></a:r></a:p>')+shape("3",paragraph("Supported")))]));
 expect(deck.slides[0].elements.map(x=>x.text)).toEqual(["Supported"]);
 expect(deck.slides[0].warnings).toContain("EQUATIONS_OR_ALTERNATE_SKIPPED");
});
it("skips only the affected table cell instead of merging alternate text",()=>{
 const table='<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="7" name="Table"/></p:nvGraphicFramePr><a:graphic><a:graphicData><a:tbl><a:tr><a:tc><a:txBody><a:p>'+alternate+'</a:p></a:txBody></a:tc><a:tc><a:txBody>'+paragraph("Supported")+'</a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>';
 const deck=extractDocx(fixture([slide(table)]));
 expect(deck.slides[0].elements.map(x=>x.text)).toEqual(["Supported"]);
 expect(deck.slides[0].elements[0].tableCell).toEqual({row:1,column:2});
});
it("marks undefined entities as a failed slide but keeps other slides",()=>{
 const deck=extractDocx(fixture([slide(shape("2",paragraph("Text &bogus; text"))),slide(shape("2",paragraph("Valid &amp; escaped")))]));
 expect(deck.slides[0].extractionStatus).toBe("failed");
 expect(deck.slides[1].elements[0].text).toBe("Valid & escaped");
});
it("preserves CDATA and valid numeric entity references",()=>{
 const deck=extractDocx(fixture([slide(shape("2",'<a:p><a:r><a:t><![CDATA[Literal &bogus; & text]]></a:t></a:r></a:p>'+paragraph("&#65; &#x42;")))]));
 expect(deck.slides[0].elements[0].text).toBe("Literal &bogus; & text\nA B");
});
it("accepts ZIP central entries in a different order from local entries",()=>{
 const bytes=new Uint8Array(archive(parts()));const view=new DataView(bytes.buffer);
 const end=bytes.length-22,start=view.getUint32(end+16,true);const records:Uint8Array[]=[];
 for(let pos=start;pos<end;){const length=46+view.getUint16(pos+28,true)+view.getUint16(pos+30,true)+view.getUint16(pos+32,true);records.push(bytes.slice(pos,pos+length));pos+=length;}
 let at=start;for(const record of records.reverse()){bytes.set(record,at);at+=record.length;}
 expect(extractDocx(bytes.buffer).slides[0].elements[0].text).toBe("Test text");
});
