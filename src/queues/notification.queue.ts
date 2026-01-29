import { Queue } from "bullmq";
import redisConnection from "../config/redis.config";
import { NotificationJobData } from "../types/notification.type";


// Create notification queue
export const notificationQueue = new Queue<NotificationJobData>("notifications", {
  connection: redisConnection
});
