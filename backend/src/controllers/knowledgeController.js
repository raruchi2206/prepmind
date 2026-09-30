const knowledgeService = require("../services/knowledgeService");
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
    const source = await knowledgeService.createUploadedKnowledgeSource({
      userId: request.user._id,
      title: request.body.title,
      file: request.file,
    });
    response.status(201).json({
      success: true,
      message: "Document uploaded successfully",
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

module.exports = {
  createKnowledgeSource,
  uploadKnowledgeSource,
  getKnowledgeSources,
  getKnowledgeSource,
  updateKnowledgeSource,
  deleteKnowledgeSource,
};
