import {describe,it,expect} from "vitest";
import {extractDocx,LIMITS} from "../../src/lib/docx/extract";
import {PKG,R,archive,fixture,parts,slide,shape,paragraph} from "../fixtures/build-pptx";
describe("local PPTX reading",()=>{
 it("joins runs without spaces and keeps paragraphs, breaks, entities and zero text",()=>{
  const deck=extractDocx(fixture([slide(shape("2",'<a:p><a:r><a:t>Sup</a:t></a:r><a:r><a:t>ply &amp; demand</a:t></a:r><a:br/><a:fld><a:t>0</a:t></a:fld></a:p>'+paragraph("Next.")))]));
  expect(deck.slides[0].elements[0]).toMatchObject({shapeId:"2",shapeName:"Text 2",text:"Supply & demand\n0\nNext.",elementId:"slide-1/shape-2"});
 });
 it("uses presentation order and accepts repeated shape ids on different slides",()=>{
  const deck=extractDocx(fixture([slide(shape("2",paragraph("First"))),slide(shape("2",paragraph("Second")))], [2,1]));
  expect(deck.slides.map(s=>s.elements[0].text)).toEqual(["Second","First"]);
  expect(new Set(deck.slides.flatMap(s=>s.elements.map(e=>e.elementId))).size).toBe(2);
 });
 it("reads nested groups and table cells with stable coordinates",()=>{
  const table='<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="7" name="Table"/></p:nvGraphicFramePr><a:graphic><a:graphicData><a:tbl><a:tr><a:tc><a:txBody>'+paragraph("A")+'</a:txBody></a:tc><a:tc><a:txBody>'+paragraph("B")+'</a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>';
  const deck=extractDocx(fixture([slide('<p:grpSp><p:grpSp>'+shape("3",paragraph("Group"))+'</p:grpSp></p:grpSp>'+table)]));
  expect(deck.slides[0].elements.map(e=>e.text)).toEqual(["Group","A","B"]);
  expect(deck.slides[0].elements[2]).toMatchObject({shapeId:"7",tableCell:{row:1,column:2},elementId:"slide-1/shape-7/cell-1-2"});
 });
 it("reports hidden, empty, unreadable and unsupported content without losing other slides",()=>{
  const data=parts([slide(shape("2",paragraph("Hidden"))+'<p:pic/>',true),slide(""),"<broken",slide(shape("2",paragraph("Good"))+'<p:oleObj/><a:graphicData uri="chart"/>')]);
  data["ppt/notesSlides/notesSlide1.xml"]="<notes/>";data["ppt/slideLayouts/slideLayout1.xml"]="<layout/>";data["ppt/slideMasters/slideMaster1.xml"]="<master/>";
  const deck=extractDocx(archive(data));
  expect(deck.slides.map(s=>s.extractionStatus)).toEqual(["read","empty","failed","read"]);
  expect(deck.slides[0].hidden).toBe(true);expect(deck.slides[0].warnings).toContain("IMAGES_SKIPPED");
  expect(deck.slides[3].warnings).toContain("CHARTS_SKIPPED");expect(deck.warnings).toContain("NOTES_SKIPPED");expect(deck.warnings).toContain("INHERITED_TEXT_SKIPPED");
 });
 it("matches namespace URIs with changed prefixes",()=>{
  const data=parts();data["ppt/slides/slide1.xml"]=slide(shape("2",paragraph("Prefix"))).replace(/(<\/?)(p):/g,"$1pres:").replace(/(<\/?)(a):/g,"$1draw:").replaceAll("xmlns:p=","xmlns:pres=").replaceAll("xmlns:a=","xmlns:draw=");
  expect(extractDocx(archive(data)).slides[0].elements[0].text).toBe("Prefix");
 });
 it.each(["../bad.xml","ppt/../bad.xml","/bad.xml","ppt\\bad.xml"])("rejects unsafe archive path %s",path=>expect(()=>extractDocx(archive({...parts(),[path]:"<x/>"}))).toThrow("UNSAFE_PACKAGE"));
 it("rejects external slide links and DTDs",()=>{
  const data=parts();data["ppt/_rels/presentation.xml.rels"]='<Relationships xmlns="'+PKG+'"><Relationship Id="s1" Type="'+R+'/slide" Target="https://example.com/slide.xml" TargetMode="External"/></Relationships>';
  expect(()=>extractDocx(archive(data))).toThrow("UNSAFE_PACKAGE");
  expect(()=>extractDocx(archive({...parts(),"custom.xml":'<!DOCTYPE x [<!ENTITY data "x">]><x>&data;</x>'}))).toThrow("UNSAFE_XML");
 });
 it("rejects non-PPTX, damaged ZIP and encrypted compound file",()=>{
  expect(()=>extractDocx(new TextEncoder().encode("not a deck").buffer)).toThrow("INVALID_FILE");
  expect(()=>extractDocx(archive({"x.xml":"<x/>"}))).toThrow("INVALID_PPTX");
  expect(()=>extractDocx(fixture().slice(0,-20))).toThrow("INVALID_FILE");
  expect(()=>extractDocx(Uint8Array.from([208,207,17,224,161,177,26,225]).buffer)).toThrow("ENCRYPTED_OR_LEGACY");
 });
 it("enforces input, slide, character, entry and XML part limits",()=>{
  expect(()=>extractDocx(new ArrayBuffer(LIMITS.fileBytes+1))).toThrow("FILE_TOO_LARGE");
  expect(()=>extractDocx(fixture(Array.from({length:151},()=>slide(""))))).toThrow("TOO_MANY_SLIDES");
  expect(()=>extractDocx(fixture([slide(shape("2",paragraph("x".repeat(150001))))]))).toThrow("TOO_MUCH_TEXT");
  expect(()=>extractDocx(archive({...parts(),"bomb.xml":"x".repeat(LIMITS.xmlPartBytes+1)}))).toThrow("XML_TOO_LARGE");
  expect(()=>extractDocx(archive(Object.fromEntries(Array.from({length:5001},(_,i)=>["e"+i,""]))))).toThrow("TOO_MANY_ENTRIES");
 });
 it("rejects duplicate shapes within a slide",()=>{
  expect(extractDocx(fixture([slide(shape("2",paragraph("A"))+shape("2",paragraph("B")))])).slides[0].extractionStatus).toBe("failed");
 });
 it("reports no editable text as empty coverage",()=>expect(extractDocx(fixture([slide("<p:pic/>")])).extractedCharacters).toBe(0));
});
