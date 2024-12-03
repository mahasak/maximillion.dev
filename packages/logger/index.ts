import express, { type Express, type Request, type Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import bodyParser from 'body-parser';
import { getLogger, redisClient } from '@maximillion/shared';

const app: Express = express();
const port = process.env.SERVER_PORT ?? 8083;
const topic = process.env.REDIS_TOPIC_NAME ?? "";
const logger = getLogger();


app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send(`Femto HPP Server`);
});

process.on('SIGTERM', () => {
  console.log('Cleaning up on SIGTERM');
  if(logger) {
    logger.close()
  }
});

process.on('SIGINT', () => {
  console.log('Cleaning up on SIGINT');
  if(logger) {
    logger.close()
  }
});

export interface LogFormat {
  level: string,
  module: string,
  traceId: string,
  message: string
}

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);

  (async () => {
    const subscriber = redisClient.duplicate();
    subscriber.on("message", function (channel:string , topicMessage: any) {
      console.log("Message: " + topicMessage + " on channel: " + channel + " is arrive!");
      if (topicMessage && topicMessage !== "") {
        const logMessage: LogFormat = JSON.parse(topicMessage);
        console.log(logMessage);
        const metadata:any = {application: "femto-sh"}
        if(logMessage.traceId) {
          metadata.traceId = logMessage.traceId;
        }
        if(logMessage.module) {
          metadata.module = logMessage.module;
        }

        console.log()
        logger.info(logMessage.message, metadata);
      }
    });

    await subscriber.subscribe(topic, (topicMessage: any) => {
      if(topicMessage !== null && topicMessage !== undefined) {
        console.log(topicMessage);
      }
    });
  })();
});
