const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeQuestionCount,
  validateQuizQuestionSet,
} = require("../src/utils/quizValidation");

test("normalizeQuestionCount accepts explicit user-selected counts", () => {
  assert.equal(normalizeQuestionCount(3), 3);
  assert.equal(normalizeQuestionCount(5), 5);
  assert.equal(normalizeQuestionCount(8), 8);
  assert.equal(normalizeQuestionCount(10), 10);
  assert.equal(normalizeQuestionCount(15), 15);
  assert.equal(normalizeQuestionCount(20), 20);
});

test("validateQuizQuestionSet rejects short or repeated quiz output", () => {
  const request = {
    questionCount: 5,
    questionType: "MCQ",
    difficulty: "Medium",
  };

  const invalid = {
    title: "Quiz",
    questions: [
      {
        questionNumber: 1,
        question: "What is thresholding?",
        type: "MCQ",
        options: ["Thresholding", "Edge detection", "Resize", "Blur"],
        correctAnswer: "Thresholding",
        explanation: "It converts an image to a binary representation.",
      },
      {
        questionNumber: 2,
        question: "What is thresholding?",
        type: "MCQ",
        options: ["Thresholding", "Edge detection", "Resize", "Blur"],
        correctAnswer: "Thresholding",
        explanation: "It converts an image to a binary representation.",
      },
    ],
  };

  assert.throws(
    () => validateQuizQuestionSet(invalid, request),
    /exactly 5 questions/i,
  );
});

test("validateQuizQuestionSet accepts a valid full-length MCQ set", () => {
  const request = {
    questionCount: 3,
    questionType: "MCQ",
    difficulty: "Medium",
  };

  const valid = {
    title: "Quiz",
    questions: [
      {
        questionNumber: 1,
        question: "What is thresholding?",
        type: "MCQ",
        options: [
          "Thresholding",
          "Canny edge detection",
          "Resizing",
          "Smoothening",
        ],
        correctAnswer: "Thresholding",
        explanation: "Thresholding separates pixels above or below a value.",
      },
      {
        questionNumber: 2,
        question: "Which method detects contours?",
        type: "MCQ",
        options: [
          "Thresholding",
          "Contour detection",
          "Color conversion",
          "Image rotation",
        ],
        correctAnswer: "Contour detection",
        explanation:
          "Contour detection identifies object boundaries in the image.",
      },
      {
        questionNumber: 3,
        question: "What does morphological opening do?",
        type: "MCQ",
        options: [
          "Removes noise",
          "Increases brightness",
          "Rotates image",
          "Resizes canvas",
        ],
        correctAnswer: "Removes noise",
        explanation:
          "Opening removes small noise while preserving larger structures.",
      },
    ],
  };

  assert.equal(validateQuizQuestionSet(valid, request).questions.length, 3);
  assert.equal(
    validateQuizQuestionSet(valid, request).questions[1].options[1],
    "Contour detection",
  );
});

test("validateQuizQuestionSet preserves option text beginning with A-D while mapping answer keys", () => {
  const result = validateQuizQuestionSet(
    {
      title: "Quiz",
      questions: [
        {
          question: "Which function retrieves contours?",
          options: ["Blur", "cv2.findContours()", "Resize", "Thresholding"],
          correctAnswer: "B",
          explanation:
            "cv2.findContours retrieves contours from a binary image.",
        },
      ],
    },
    { questionCount: 1, questionType: "MCQ" },
  );

  assert.deepEqual(result.questions[0].options, [
    "Blur",
    "cv2.findContours()",
    "Resize",
    "Thresholding",
  ]);
  assert.equal(result.questions[0].correctAnswer, "cv2.findContours()");
});

test("validateQuizQuestionSet keeps questions about distinct retrieval modes", () => {
  const result = validateQuizQuestionSet(
    {
      title: "Quiz",
      questions: [
        {
          question: "What does cv2.RETR_EXTERNAL return?",
          options: ["Outer contours", "All contours", "No contours", "Pixels"],
          correctAnswer: "A",
          explanation: "It returns only outermost contours.",
        },
        {
          question: "What does cv2.RETR_LIST return?",
          options: ["Outer contours", "All contours", "No contours", "Pixels"],
          correctAnswer: "B",
          explanation: "It returns all contours without hierarchy.",
        },
      ],
    },
    { questionCount: 2, questionType: "MCQ" },
  );

  assert.equal(result.questions.length, 2);
});

test("validateQuizQuestionSet reports incomplete fields and invalid answer mappings", () => {
  const request = {
    questionCount: 1,
    questionType: "MCQ",
  };

  const missingExplanation = {
    title: "Quiz",
    questions: [
      {
        question: "Which method detects contours?",
        options: ["Thresholding", "findContours", "Resize", "Blur"],
        correctAnswer: "findContours",
      },
    ],
  };
  assert.throws(
    () => validateQuizQuestionSet(missingExplanation, request),
    /Question 1 is missing an explanation/i,
  );

  const invalidAnswer = {
    title: "Quiz",
    questions: [
      {
        question: "Which method detects contours?",
        options: ["Thresholding", "findContours", "Resize", "Blur"],
        correctAnswer: "imread",
        explanation: "findContours retrieves contours from a binary image.",
      },
    ],
  };
  assert.throws(
    () => validateQuizQuestionSet(invalidAnswer, request),
    /Question 1 has invalid correctAnswer/i,
  );
});

test("validateQuizQuestionSet accepts mixed hard quizzes where correctAnswer is a letter or explicit option text", () => {
  const request = {
    questionCount: 2,
    questionType: "Mixed",
    difficulty: "Hard",
  };

  const valid = {
    title: "Quiz",
    questions: [
      {
        questionNumber: 1,
        question:
          "Which technique separates foreground from background using a threshold?",
        type: "MCQ",
        options: [
          "A. Morphological erosion",
          "B. Thresholding",
          "C. Histogram equalization",
          "D. Edge smoothing",
        ],
        correctAnswer: "B",
        explanation:
          "Thresholding classifies pixels by intensity value to isolate foreground objects.",
      },
      {
        questionNumber: 2,
        question: "Contour extraction is a form of object boundary detection.",
        type: "TRUE_FALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "Contours trace boundaries around detected objects in binary or edge maps.",
      },
    ],
  };

  const result = validateQuizQuestionSet(valid, request);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].correctAnswer, "Thresholding");
  assert.equal(result.questions[1].correctAnswer, "True");
});
