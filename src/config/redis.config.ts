import IORedis from "ioredis";
import {
  REDIS_USERNAME,
  REDIS_PASSWORD,
  REDIS_HOST,
  REDIS_PORT,
} from "../utils/constants";
import sysLogger from "../utils/logger";

const redisConnection = new IORedis({
  maxRetriesPerRequest: null,
  username: REDIS_USERNAME || undefined,
  password: REDIS_PASSWORD || undefined,
  host: REDIS_HOST || "localhost",
  port: REDIS_PORT ? parseInt(REDIS_PORT) : 6379,
});

redisConnection.on("error", (err) => {
  sysLogger.error(`Redis connection error: ${err}`);
});

export default redisConnection;