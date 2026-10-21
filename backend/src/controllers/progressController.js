const KnowledgeSource = require("../models/KnowledgeSource");
const GeneratedContent = require("../models/GeneratedContent");
const Attempt = require("../models/Attempt");

async function getProgress(req, res, next) {
  try {
    const userId = req.user._id;

    const [sourcesCount, generatedCount, attempts] = await Promise.all([
      KnowledgeSource.countDocuments({ userId }),
      GeneratedContent.countDocuments({ userId }),
      Attempt.find({ userId }).sort({ createdAt: -1 }),
    ]);

    let totalScore = 0;
    let totalMarks = 0;
    let questionsAnswered = 0;

    for (const a of attempts) {
      totalScore += a.score || 0;
      totalMarks += a.totalMarks || 0;
      questionsAnswered += (a.answers || []).length;
    }

    const averageScore = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

    const recentScores = attempts.slice(0, 10).map((a) => ({
      title: a.assessmentTitle,
      type: a.assessmentType,
      score: a.score,
      totalMarks: a.totalMarks,
      percentage: a.percentage,
      date: a.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        sourcesCount,
        generatedCount,
        quizzesAttempted: attempts.length,
        questionsAnswered,
        averageScore,
        recentScores,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProgress,
};
