import { GeneratedDocumentPage } from "../components/GeneratedDocumentPage";
import { ragApi } from "../services/api";
import { generateSummaryPDF } from "../utils/pdfGenerator";

export default function Summary({ theme }) {
  return (
    <GeneratedDocumentPage
      theme={theme}
      kind="summary"
      sectionLabel="Summary"
      titlePrefix={/^Summary:\s*/}
      emptyTitle="Knowledge Summary"
      emptyDescription="PrepMind reads every part of the selected source and writes an overview, main concepts, key terms, examples and conclusions grounded in it."
      loadingTitle="Generating summary…"
      loadingDetail="Reading the whole source and condensing it"
      generate={ragApi.generateSummary}
      downloadPdf={generateSummaryPDF}
    />
  );
}
