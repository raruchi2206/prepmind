const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const notificationService = require("../services/notificationService");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (request, response, next) => {
  try {
    const data = await notificationService.listNotifications(request.user._id, {
      limit: request.query.limit,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/unread-count", async (request, response, next) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(request.user._id);
    response.json({ success: true, data: { unreadCount } });
  } catch (error) {
    next(error);
  }
});

router.post("/read-all", async (request, response, next) => {
  try {
    const updated = await notificationService.markAllRead(request.user._id);
    response.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", async (request, response, next) => {
  try {
    const notification = await notificationService.markRead(request.user._id, request.params.id);
    response.json({ success: true, data: { notification } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
