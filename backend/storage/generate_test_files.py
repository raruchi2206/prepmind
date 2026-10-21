import os
from PIL import Image, ImageDraw, ImageFont

TEST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_files"))
os.makedirs(TEST_DIR, exist_ok=True)

# 1. Create a clear PNG image with readable text for OCR test
img_path = os.path.join(TEST_DIR, "test_ocr.png")
img = Image.new("RGB", (800, 300), color=(255, 255, 255))
draw = ImageDraw.Draw(img)
# Draw distinct high-contrast black text
text_lines = [
    "Machine Learning and Deep Learning Concepts",
    "Supervised learning trains models on labeled datasets.",
    "Unsupervised learning discovers hidden patterns in data.",
    "Neural networks consist of input, hidden, and output layers."
]
y = 30
for line in text_lines:
    draw.text((40, y), line, fill=(0, 0, 0))
    y += 50
img.save(img_path)
print(f"Created OCR test image: {img_path}")

# 2. Create a clean TXT file
txt_path = os.path.join(TEST_DIR, "test_doc.txt")
with open(txt_path, "w", encoding="utf-8") as f:
    f.write("""Cloud Computing and Microservices Architecture:
Cloud computing delivers computing services over the internet including servers, storage, databases, networking, and software.
The three primary cloud service models are Infrastructure as a Service (IaaS), Platform as a Service (PaaS), and Software as a Service (SaaS).
Microservices architecture arranges an application as a collection of loosely coupled, fine-grained services communicating through lightweight protocols.
Containerization using Docker packages an application and its dependencies into an isolated container that runs uniformly across diverse environments.
Kubernetes is an open-source system for automating deployment, scaling, and management of containerized applications.""")
print(f"Created TXT test file: {txt_path}")

# 3. Create a DOCX file with paragraphs and a table
try:
    import docx
    doc = docx.Document()
    doc.add_heading("Database Management Systems Fundamentals", level=1)
    doc.add_paragraph("A database management system (DBMS) is software that interacts with end users, applications, and the database itself to capture and analyze data.")
    doc.add_paragraph("ACID properties guarantee that database transactions are processed reliably: Atomicity, Consistency, Isolation, and Durability.")
    table = doc.add_table(rows=1, cols=3)
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = "Feature"
    hdr_cells[1].text = "SQL"
    hdr_cells[2].text = "NoSQL"
    row1 = table.add_row().cells
    row1[0].text = "Schema"
    row1[1].text = "Fixed relational schema"
    row1[2].text = "Dynamic flexible schema"
    row2 = table.add_row().cells
    row2[0].text = "Scaling"
    row2[1].text = "Vertical scalability"
    row2[2].text = "Horizontal scalability"
    docx_path = os.path.join(TEST_DIR, "test_doc.docx")
    doc.save(docx_path)
    print(f"Created DOCX test file: {docx_path}")
except Exception as e:
    print(f"Failed to create DOCX: {e}")

# 4. Create a valid PPTX presentation
try:
    import zipfile
    pptx_path = os.path.join(TEST_DIR, "test_presentation.pptx")
    # Build minimal valid PPTX using zipfile
    with zipfile.ZipFile(pptx_path, "w") as z:
        z.writestr("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>""")
        z.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>""")
        z.writestr("ppt/presentation.xml", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>""")
        z.writestr("ppt/slides/slide1.xml", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:t>Data Structures and Algorithms Presentation</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:r>
              <a:t>Binary Search Trees maintain ordered elements where left child is smaller and right child is greater.</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:r>
              <a:t>Dijkstra algorithm calculates the shortest path from a single source vertex to all other vertices in a weighted graph.</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>""")
    print(f"Created PPTX test file: {pptx_path}")
except Exception as e:
    print(f"Failed to create PPTX: {e}")

# 5. Create a PDF file using reportlab
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    pdf_path = os.path.join(TEST_DIR, "test_doc.pdf")
    c = canvas.Canvas(pdf_path, pagesize=letter)
    c.drawString(100, 750, "Computer Networks and Security Protocols")
    c.drawString(100, 720, "The OSI model consists of seven layers: Physical, Data Link, Network,")
    c.drawString(100, 700, "Transport, Session, Presentation, and Application.")
    c.drawString(100, 670, "TCP provides reliable, ordered, and error-checked byte stream delivery.")
    c.drawString(100, 650, "UDP offers connectionless, low-latency transmission for time-sensitive traffic.")
    c.drawString(100, 620, "Public key cryptography uses pairs of keys: public key for encryption")
    c.drawString(100, 600, "and private key for decryption.")
    c.save()
    print(f"Created PDF test file: {pdf_path}")
except Exception as e:
    print(f"Failed to create PDF with reportlab: {e}")

print("Test file generation complete!")
