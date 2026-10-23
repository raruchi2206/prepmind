import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  createSummaryPDFDocument,
  createNotesPDFDocument,
  createQuizResultPDFDocument,
} from "../src/utils/pdfGenerator.js";

const outDir = path.resolve("docs/pdf_inspection");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log("=== STEP 1: Generating Test Summary PDF ===");
const sampleSummary = {
  title: "Summary: Cloud Computing & Microservices Architecture",
  content: `# Cloud Computing & Microservices Architecture - Revision Summary

## 1. Overview
Cloud computing provides on-demand availability of computer system resources, especially data storage and computing power, without direct active management by the user. Microservices partition large software systems into independent, loosely coupled services.

## 2. Core Service Models Comparison
The three foundational cloud service models each delegate different levels of infrastructure management:

| Service Model | Managed by Provider | Managed by Customer | Key Examples |
| :--- | :--- | :--- | :--- |
| **IaaS** | Virtualization, Servers, Storage, Networking | OS, Middleware, Runtime, Data, Applications | AWS EC2, GCP Compute Engine |
| **PaaS** | Hardware, OS, Runtime, Database Engines | Application Code, Business Logic, Configurations | Heroku, Google App Engine |
| **SaaS** | Complete Software Application & Infrastructure | User Settings, Data Entry, Access Controls | Google Workspace, Microsoft 365 |

## 3. Mathematical Foundations & Scalability Equations
In distributed load balancing and queuing analysis, system capacity is modeled using Little's Law:

$$L = \\lambda \\times W$$

Where:
- $L$ represents average number of requests in the system.
- $\\lambda$ represents arrival rate of inbound requests.
- $W$ represents average wait time per request.

Performance speedup through parallelization is bounded by Amdahl's Law:

$$S(s) = \\frac{1}{(1 - p) + \\frac{p}{s}}$$

## 4. Key Takeaways & Exam Checklist
- [x] IaaS delivers raw virtual machines; customer manages OS and runtime.
- [x] PaaS abstracts the operating system and scaling layers.
- [x] Microservices communicate via lightweight protocols (REST HTTP/JSON or gRPC).
- [x] Service discovery and API Gateways provide central routing and token validation.
`,
};

const summaryDoc = createSummaryPDFDocument(sampleSummary, "Cloud Computing Architecture Guide");
const summaryPath = path.join(outDir, "summary_document.pdf");
fs.writeFileSync(summaryPath, Buffer.from(summaryDoc.output("arraybuffer")));
console.log(`Saved Summary PDF: ${summaryPath} (${summaryDoc.internal.getNumberOfPages()} pages)`);

console.log("\n=== STEP 2: Generating Test Notes PDF ===");
const sampleNotes = {
  title: "Academic Notes: Relational Databases & ACID Guarantees",
  content: `# Relational Databases & Transactional ACID Guarantees - Academic Notes

## 1. Introduction & Overview
A database transaction represents a single logical unit of work that accesses and possibly modifies the contents of a database. Transactions in relational systems are governed by the ACID paradigm to ensure reliable execution despite system crashes or concurrent queries.

## 2. The Four Pillars of ACID

### 2.1 Atomicity (All-or-Nothing Guarantee)
Atomicity ensures that all operations within a transaction block either complete successfully or leave no partial modifications behind.
- **Mechanism**: Implemented using Write-Ahead Logging (WAL) and undo logs.
- If a failure occurs midway, the database engine reads the WAL backward and reverts every uncommitted write.

### 2.2 Consistency
Ensures that a transaction transitions the database from one valid state to another valid state, satisfying all schema constraints, foreign keys, and unique indices.

### 2.3 Isolation Levels & Concurrency Anomalies
Isolation prevents concurrent transactions from interfering with each other's execution:

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
| :--- | :--- | :--- | :--- | :--- |
| **Read Uncommitted** | Permitted | Permitted | Permitted | Permitted |
| **Read Committed** | Prevented | Permitted | Permitted | Permitted |
| **Repeatable Read** | Prevented | Prevented | Permitted | Permitted |
| **Serializable** | Prevented | Prevented | Prevented | Prevented |

### 2.4 Durability
Guarantees that once a transaction commits, its effects persist permanently in non-volatile storage, even in the event of an immediate power loss.

## 3. Distributed Systems: The CAP Theorem
In distributed data stores, the CAP Theorem proves that a distributed system can provide at most two of the following three guarantees simultaneously:
1. **Consistency ($C$)**: Every read receives the most recent write or an error.
2. **Availability ($A$)**: Every non-failing node returns a non-error response.
3. **Partition Tolerance ($P$)**: The system continues to operate despite dropped or delayed network packets.
`,
};

const notesDoc = createNotesPDFDocument(sampleNotes, "Database Management Systems (CS301)");
const notesPath = path.join(outDir, "notes_document.pdf");
fs.writeFileSync(notesPath, Buffer.from(notesDoc.output("arraybuffer")));
console.log(`Saved Notes PDF: ${notesPath} (${notesDoc.internal.getNumberOfPages()} pages)`);

console.log("\n=== STEP 3: Generating Test Quiz Result PDF ===");
const sampleAssessment = {
  title: "Quiz: Data Structures & Graph Algorithms",
  difficulty: "Medium",
  questionType: "MCQ",
  questions: [
    {
      id: "q1",
      question: "What is the worst-case time complexity of Dijkstra's algorithm implemented with a binary min-heap?",
      options: [
        "O(V^2)",
        "O((V + E) log V)",
        "O(E log E)",
        "O(V log V)",
      ],
      correctAnswer: "O((V + E) log V)",
      explanation: "Using a binary min-heap, extracting min takes O(log V) V times and decrease-key takes O(log V) for each of the E edges, giving O((V + E) log V).",
    },
    {
      id: "q2",
      question: "Which data structure is primarily utilized in Breadth-First Search (BFS) graph traversal?",
      options: [
        "Stack (LIFO)",
        "Queue (FIFO)",
        "Binary Search Tree",
        "Hash Map",
      ],
      correctAnswer: "Queue (FIFO)",
      explanation: "BFS explores vertices in order of their distance from the source, naturally requiring a FIFO queue.",
    },
    {
      id: "q3",
      question: "Can Bellman-Ford correctly detect negative-weight cycles in a directed graph?",
      options: [
        "Yes, by checking if relaxing edges an additional |V|-th time further reduces distances",
        "No, it only operates on directed acyclic graphs (DAGs)",
        "Only if all vertices have positive in-degrees",
        "No, negative weights always cause an infinite loop",
      ],
      correctAnswer: "Yes, by checking if relaxing edges an additional |V|-th time further reduces distances",
      explanation: "If any distance decreases on the |V|-th relaxation iteration, a negative-weight cycle is reachable.",
    },
    {
      id: "q4",
      question: "What is the primary trade-off when using an Adjacency Matrix over an Adjacency List?",
      options: [
        "O(1) edge lookup at the expense of O(V^2) space complexity",
        "Faster vertex insertion but slower edge lookups",
        "Less memory for sparse graphs",
        "Inability to represent weighted edges",
      ],
      correctAnswer: "O(1) edge lookup at the expense of O(V^2) space complexity",
      explanation: "An adjacency matrix allows instant O(1) checks for edge existence, but requires V^2 space regardless of edge density.",
    },
    {
      id: "q5",
      question: "In a Minimum Spanning Tree (MST), Kruskal's algorithm utilizes which data structure to prevent cycles?",
      options: [
        "Disjoint-Set (Union-Find) with path compression",
        "Doubly Linked List",
        "Trie",
        "Bloom Filter",
      ],
      correctAnswer: "Disjoint-Set (Union-Find) with path compression",
      explanation: "Disjoint-Set efficiently determines whether two vertices already belong to the same connected component in nearly O(1) time.",
    },
  ],
};

const sampleAttempt = {
  totalMarks: 5,
  percentage: 80,
  timeSpentSeconds: 42,
  answers: [
    {
      questionId: "q1",
      userAnswer: "O((V + E) log V)",
      isCorrect: true,
    },
    {
      questionId: "q2",
      userAnswer: "Queue (FIFO)",
      isCorrect: true,
    },
    {
      questionId: "q3",
      userAnswer: "Only if all vertices have positive in-degrees",
      isCorrect: false, // Student got this one wrong
    },
    {
      questionId: "q4",
      userAnswer: "O(1) edge lookup at the expense of O(V^2) space complexity",
      isCorrect: true,
    },
    {
      questionId: "q5",
      userAnswer: "Disjoint-Set (Union-Find) with path compression",
      isCorrect: true,
    },
  ],
};

const quizDoc = createQuizResultPDFDocument(sampleAssessment, sampleAttempt, "Data Structures & Graph Algorithms");
const quizPath = path.join(outDir, "quiz_result_document.pdf");
fs.writeFileSync(quizPath, Buffer.from(quizDoc.output("arraybuffer")));
console.log(`Saved Quiz Result PDF: ${quizPath} (${quizDoc.internal.getNumberOfPages()} pages)`);

console.log("\n=== STEP 4: Rendering PDF Pages into PNG Images using pypdfium2 ===");
const pyScript = `
import os
import pypdfium2 as pdfium

out_dir = r"${outDir.replace(/\\/g, "/")}"
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
`;

fs.writeFileSync(path.join(outDir, "render_pages.py"), pyScript);
const output = execSync('py -3.11 "' + path.join(outDir, "render_pages.py") + '"', { encoding: "utf-8" });
console.log(output);

console.log("=== ALL TEST PDFS GENERATED & RENDERED TO IMAGES SUCCESSFULLY ===");
