
import os
import pypdfium2 as pdfium

out_dir = r"C:/Users/Rana Ruchi/Downloads/Design Premium AI Web App/docs/pdf_inspection"
for fname in ["summary_document.pdf", "notes_document.pdf", "quiz_result_document.pdf"]:
    fpath = os.path.join(out_dir, fname)
    if not os.path.exists(fpath):
        continue
    pdf = pdfium.PdfDocument(fpath)
    base = os.path.splitext(fname)[0]
    for idx, page in enumerate(pdf):
        # Render at 150 DPI for crisp visual inspection
        img = page.render(scale=2.0).to_pil()
        png_path = os.path.join(out_dir, f"{base}_page_{idx+1}.png")
        img.save(png_path)
        print(f"RENDERED: {png_path} ({img.width}x{img.height})")
