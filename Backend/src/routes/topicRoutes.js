import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  createTopic,
  deleteTopic,
  getTopicById,
  getTopicStatus,
  getTopics,
  retryTopicPlan,
} from "../controllers/topicController.js";

const router = express.Router();

router.post("/create", authMiddleware, createTopic);
router.get("/", authMiddleware, getTopics);
router.post("/:id/retry", authMiddleware, retryTopicPlan);
router.get("/:id/status", authMiddleware, getTopicStatus);
router.get("/:id", authMiddleware, getTopicById);
router.delete("/:id", authMiddleware, deleteTopic);

export default router;
