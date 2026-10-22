const KnowledgeSource = require("../models/KnowledgeSource");
const GeneratedContent = require("../models/GeneratedContent");
const Attempt = require("../models/Attempt");

const ACTIVITY_DAYS = 30;
const TREND_LIMIT = 30;
// Per-source performance is only labelled a strength or weakness with enough attempts
const MIN_ATTEMPTS_FOR_TOPIC = 2;

function resolveTimeZone(raw) {
  if (typeof raw !== "string" || !raw || raw.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return "UTC";
  }
}

function dayKey(date, timeZone) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

async function getProgress(req, res, next) {
  try {
    const userId = req.user._id;
    const timeZone = resolveTimeZone(req.query.tz);
    const since = new Date(Date.now() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000);

    const [sources, generatedByType, attempts, recentGenerated, generatedRecentDates] = await Promise.all([
      KnowledgeSource.find({ userId }).select("title status type createdAt"),
      GeneratedContent.aggregate([
        { $match: { userId } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      Attempt.find({ userId })
        .sort({ createdAt: 1 })
        .select("assessmentId assessmentTitle assessmentType knowledgeSourceIds answers.isCorrect answers.userAnswer score totalMarks percentage timeSpentSeconds createdAt"),
      GeneratedContent.find({ userId, type: { $ne: "ASK" } })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("type title knowledgeSourceIds createdAt"),
      GeneratedContent.find({ userId, createdAt: { $gte: since } }).select("createdAt"),
    ]);

    const generated = Object.fromEntries(generatedByType.map((g) => [g._id, g.count]));
    const sourceTitles = new Map(sources.map((s) => [s._id.toString(), s.title]));

    // Quiz accuracy is measured per answered question; each attempt is counted once
    let questionsAnswered = 0;
    let correct = 0;
    let totalScore = 0;
    let totalMarks = 0;
    const quizAssessments = new Set();
    for (const attempt of attempts) {
      totalScore += attempt.score || 0;
      totalMarks += attempt.totalMarks || 0;
      if (attempt.assessmentType === "QUIZ") {
        quizAssessments.add(attempt.assessmentId.toString());
        for (const answer of attempt.answers || []) {
          const answered = answer.userAnswer !== undefined && answer.userAnswer !== null && String(answer.userAnswer).trim() !== "";
          if (!answered) continue;
          questionsAnswered += 1;
          if (answer.isCorrect) correct += 1;
        }
      }
    }
    const accuracy = questionsAnswered > 0 ? Math.round((correct / questionsAnswered) * 100) : null;
    const averageScore = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : null;

    const scoreTrend = attempts.slice(-TREND_LIMIT).map((a) => ({
      id: a._id.toString(),
      date: a.createdAt,
      percentage: a.percentage,
      title: a.assessmentTitle,
      type: a.assessmentType,
    }));

    // Activity per day for the last 30 days, in the viewer's time zone
    const days = [];
    const dayIndex = new Map();
    for (let i = ACTIVITY_DAYS - 1; i >= 0; i -= 1) {
      const key = dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000), timeZone);
      if (!dayIndex.has(key)) {
        dayIndex.set(key, days.length);
        days.push({ date: key, attempts: 0, generated: 0 });
      }
    }
    for (const a of attempts) {
      if (a.createdAt < since) continue;
      const idx = dayIndex.get(dayKey(a.createdAt, timeZone));
      if (idx !== undefined) days[idx].attempts += 1;
    }
    for (const g of generatedRecentDates) {
      const idx = dayIndex.get(dayKey(g.createdAt, timeZone));
      if (idx !== undefined) days[idx].generated += 1;
    }

    // Performance grouped by knowledge source (the topic unit PrepMind stores)
    const bySource = new Map();
    for (const a of attempts) {
      const sourceId = a.knowledgeSourceIds?.[0]?.toString();
      if (!sourceId) continue;
      const entry = bySource.get(sourceId) || { sourceId, attempts: 0, percentageSum: 0, lastAttemptAt: null };
      entry.attempts += 1;
      entry.percentageSum += a.percentage || 0;
      entry.lastAttemptAt = a.createdAt;
      bySource.set(sourceId, entry);
    }
    const topicPerformance = [...bySource.values()]
      .map((e) => ({
        sourceId: e.sourceId,
        title: sourceTitles.get(e.sourceId) || "Deleted source",
        attempts: e.attempts,
        averagePercentage: Math.round(e.percentageSum / e.attempts),
        sufficientData: e.attempts >= MIN_ATTEMPTS_FOR_TOPIC,
        lastAttemptAt: e.lastAttemptAt,
      }))
      .sort((a, b) => b.averagePercentage - a.averagePercentage);

    const recentAttempts = attempts
      .slice(-10)
      .reverse()
      .map((a) => ({
        id: a._id.toString(),
        assessmentId: a.assessmentId.toString(),
        title: a.assessmentTitle,
        type: a.assessmentType,
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.percentage,
        timeSpentSeconds: a.timeSpentSeconds,
        date: a.createdAt,
      }));

    res.status(200).json({
      success: true,
      data: {
        timeZone,
        totals: {
          sources: sources.length,
          sourcesReady: sources.filter((s) => s.status === "READY").length,
          youtubeSources: sources.filter((s) => s.type === "YOUTUBE" && s.status === "READY").length,
          summaries: generated.SUMMARY || 0,
          notes: generated.NOTES || 0,
          quizzesGenerated: generated.QUIZ || 0,
          practicePapers: generated.PRACTICE_PAPER || 0,
          vivas: generated.VIVA || 0,
          questionsAsked: generated.ASK || 0,
          attempts: attempts.length,
          quizzesCompleted: quizAssessments.size,
          questionsAnswered,
          correctAnswers: correct,
          incorrectAnswers: questionsAnswered - correct,
          accuracy,
          averageScore,
          studyMinutes: Math.round(attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) / 60),
        },
        scoreTrend,
        activityByDay: days,
        topicPerformance,
        recentAttempts,
        recentGenerated: recentGenerated.map((g) => ({
          id: g._id.toString(),
          type: g.type,
          title: g.title,
          sourceId: g.knowledgeSourceIds?.[0]?.toString() || null,
          date: g.createdAt,
        })),

        // Fields kept for existing clients
        sourcesCount: sources.length,
        generatedCount: generatedByType.reduce((sum, g) => sum + g.count, 0),
        quizzesAttempted: attempts.length,
        questionsAnswered,
        averageScore: averageScore ?? 0,
        recentScores: recentAttempts.map((a) => ({
          title: a.title,
          type: a.type,
          score: a.score,
          totalMarks: a.totalMarks,
          percentage: a.percentage,
          date: a.date,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProgress,
};
