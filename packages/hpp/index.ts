import express, { type Express, type Request, type Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import bodyParser from 'body-parser';

import { redisClient } from '@maximillion/shared';
import type { ChangesEvent, MessagingEvent } from '@maximillion/shared/types';
import { changeHook, messageHook, postbackHook } from './service/hpp';

const app: Express = express();
const port = process.env.SERVER_PORT ?? 8082;
const topic = process.env.REDIS_TOPIC_NAME ?? "";

export interface WebhookEntry {
  id: string;
  time: number;
  messaging?: any;
  changes?: any;
}


export interface WrappedMessage {
  traceId: string;
  pageEntry: WebhookEntry;
}

console.log(topic)
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send(`Femto HPP Server`);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);

  (async () => {
    const subscriber = redisClient.duplicate();
    subscriber.on("message", function (channel, topicMessage) {
      console.log("test}")
      console.log("Message: " + topicMessage + " on channel: " + channel + " is arrive!");
      if (topicMessage && topicMessage !== "") {
        try {
          const wrappedMessage : WrappedMessage = JSON.parse(topicMessage)
          if (wrappedMessage && wrappedMessage.pageEntry.messaging) {
            const messaging = wrappedMessage.pageEntry.messaging;
            messaging.forEach(async (message: any) => {
              await processWebhookMessages(message);
            });
          }

          if (wrappedMessage && wrappedMessage.pageEntry && wrappedMessage.pageEntry.changes) {
            wrappedMessage.pageEntry.changes.forEach(async function (changes: ChangesEvent) {
              await changeHook(changes);
            });
          }
        } catch (error) {
          console.log("error")
          console.log(error)
        }
      }
    });

    await subscriber.subscribe(topic, (topicMessage) => {
      if(topicMessage !== null && topicMessage !== undefined) {
        console.log(topicMessage);
      }
    });
  })();
});

export const processWebhookMessages = async (event: MessagingEvent) => {
  if (event.message) {
    await receivedMessage(event)
  } else if (event.postback) {
    await postbackHook(event);
  } else {
    console.log(`Unable to process received messagingEvent: ${event}`)
  }
}

export const receivedMessage = async (event: MessagingEvent) => {
  if (event.message?.text) {
    await messageHook(event);
  }
}
