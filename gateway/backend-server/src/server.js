import { createServer } from "http";
import app from "./app.js";
import config from "./config/index.js";
import { initSocket } from "./socket/index.js";
import logger from "../logger.js";

const server = createServer(app);
initSocket(server);

server.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});
