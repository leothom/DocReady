import {it,expect} from "vitest";
import {extractDocx} from "../../src/lib/docx/extract";
import {fixture,paragraph,shape,slide} from "../fixtures/build-pptx";
it("skips alternate branches instead of reading both conflicting copies",()=>{
 const alternate='<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice>'+shape("3",paragraph("Choice"))+'</mc:Choice><mc:Fallback>'+shape("3",paragraph("Fallback"))+'</mc:Fallback></mc:AlternateContent>';
 const deck=extractDocx(fixture([slide(shape("2",paragraph("Visible"))+alternate)]));
 expect(deck.slides[0].extractionStatus).toBe("read");expect(deck.slides[0].elements.map(x=>x.text)).toEqual(["Visible"]);
 expect(deck.slides[0].warnings).toContain("EQUATIONS_OR_ALTERNATE_SKIPPED");
});
