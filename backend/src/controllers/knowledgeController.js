const knowledgeService = require("../services/knowledgeService");
const knowledgeIngestionService = require("../services/knowledgeIngestionService");
const { createHttpError } = require("../middleware/errorMiddleware");

async function createKnowledgeSource(request, response, next) {
  try {
    const { title, type, youtubeUrl } = request.body;
    const source = await knowledgeService.createKnowledgeSource({
      userId: request.user._id,
      title,
      type,
      youtubeUrl,
    });
    response.status(201).json({
      success: true,
      message: "Knowledge source created successfully",
      data: { knowledgeSource: source.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function uploadKnowledgeSource(request, response, next) {
  try {
    if (!request.file) {
      throw createHttpError(400, "Please provide a document file to upload");
    }
    console.log("[KNOWLEDGE]\nUpload started");
    const source = await knowledgeService.createUploadedKnowledgeSource({
      userId: request.user._id,
      title: request.body.title,
      file: request.file,
    });
    console.log("[KNOWLEDGE]\nSource created");
    response.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: { knowledgeSource: source.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function importYouTubeSource(request, response, next) {
  try {
    const { url, title, language, reprocess } = request.body;
    const source = await knowledgeService.createYouTubeKnowledgeSource({
      userId: request.user._id,
      url,
      title,
      language,
      reprocess: Boolean(reprocess),
    });
    response.status(201).json({
      success: true,
      message: "YouTube source created. Start processing to extract its transcript.",
      data: { knowledgeSource: source.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function getKnowledgeSources(request, response, next) {
  try {
    const sources = await knowledgeService.getKnowledgeSources(
      request.user._id,
    );
    response.json({
      success: true,
      data: { knowledgeSources: sources },
    });
  } catch (error) {
    next(error);
  }
}

async function getKnowledgeSource(request, response, next) {
  try {
    const source = await knowledgeService.getKnowledgeSourceById({
      id: request.params.id,
      userId: request.user._id,
    });
    response.json({
      success: true,
      data: { knowledgeSource: source },
    });
  } catch (error) {
    next(error);
  }
}

async function updateKnowledgeSource(request, response, next) {
  try {
    const { title } = request.body;
    const updated = await knowledgeService.updateKnowledgeSource({
      id: request.params.id,
      userId: request.user._id,
      title,
    });
    response.json({
      success: true,
      message: "Knowledge source updated successfully",
      data: { knowledgeSource: updated },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteKnowledgeSource(request, response, next) {
  try {
    await knowledgeService.deleteKnowledgeSource({
      id: request.params.id,
      userId: request.user._id,
    });
    response.json({
      success: true,
      message: "Knowledge source deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function processKnowledgeSource(request, response, next) {
  try {
    const result = await knowledgeIngestionService.processKnowledgeSource(
      request.params.id,
      request.user._id,
    );
    response.json({
      success: true,
      message: "Knowledge source processed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelKnowledgeProcessing(request, response, next) {
  try {
    const result = await knowledgeIngestionService.cancelProcessing(
      request.params.id,
      request.user._id,
    );
    response.json({
      success: true,
      message: "Processing cancelled",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function reviewKnowledgeSource(request, response, next) {
  try {
    const result = await knowledgeIngestionService.reviewSource(
      request.params.id,
      request.user._id,
      request.body?.decision,
    );
    response.json({
      success: true,
      message:
        request.body?.decision === "approve"
          ? "Source approved and processed"
          : "Import cancelled",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getKnowledgeChunks(request, response, next) {
  try {
    const chunks = await knowledgeIngestionService.getKnowledgeChunks(
      request.params.id,
      request.user._id,
    );
    response.json({
      success: true,
      data: { chunks },
    });
  } catch (error) {
    next(error);
  }
}

async function reindexKnowledgeSource(request, response, next) {
  try {
    const result = await knowledgeService.reindexKnowledgeSource({
      id: request.params.id,
      userId: request.user._id,
    });
    response.json({
      success: true,
      message: "Knowledge source reindexed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function reindexAllSources(request, response, next) {
  try {
    const results = await knowledgeService.reindexAllSources(request.user._id);
    response.json({
      success: true,
      message: "All knowledge sources reindexed successfully",
      data: { results },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createKnowledgeSource,
  uploadKnowledgeSource,
  importYouTubeSource,
  getKnowledgeSources,
  getKnowledgeSource,
  updateKnowledgeSource,
  deleteKnowledgeSource,
  processKnowledgeSource,
  cancelKnowledgeProcessing,
  reviewKnowledgeSource,
  getKnowledgeChunks,
  reindexKnowledgeSource,
  reindexAllSources,
};
