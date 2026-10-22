import { GeneratedDocumentPage } from "../components/GeneratedDocumentPage";
import { ragApi } from "../services/api";
import { generateNotesPDF } from "../utils/pdfGenerator";

export default function Notes({ theme }) {
  return (
    <GeneratedDocumentPage
      theme={theme}
      kind="notes"
      sectionLabel="Study Notes"
      titlePrefix={/^Notes:\s*/}
      emptyTitle="Study Notes"
      emptyDescription="PrepMind turns the whole source into organised revision notes: headings, definitions, key facts, formulas and examples taken from the material."
      loadingTitle="Writing study notes…"
      loadingDetail="Reading the whole source and organising it"
      generate={ragApi.generateNotes}
      downloadPdf={generateNotesPDF}
    />
  );
}
