import express, { type Express, type Request, type Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { redisClient } from '@maximillion/shared';
import type { ChangesEvent, MessagingEvent, WrappedMessage } from '@maximillion/shared/types';
import { bankslipDetectionChangesHook, bankslipDetectionMessageHook, bankslipDetectionPostbackHook, bankslipDetectionQuickReplyHook } from './service/bankslip';
const app: Express = express();
const port = process.env.PORT ?? 8081;
const topic = process.env.REDIS_TOPIC_NAME ?? "bankslip_prod";
app.use(express.json());

app.get('/', async (req: Request, res: Response) => {
  res.send(`Express + TypeScript Server`);
});

app.listen(port, async () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  (async () => {
    const subscriber = redisClient.duplicate();

    subscriber.on("message", function (topic, topicMessage) {
      console.log("Message: " + topicMessage + " on topic: " + topic + " is arrive!\n");
      if (topicMessage && topicMessage !== "") {
        try {
          const wrappedMessage: WrappedMessage = JSON.parse(topicMessage)
          if (wrappedMessage && wrappedMessage.pageEntry.messaging) {
            const messaging = wrappedMessage.pageEntry.messaging;
            messaging.forEach(async (message: any) => {
              await processWebhookMessages(message);
            });
            // await bankslipDetectionMessageHook(event)
          }

          if (wrappedMessage && wrappedMessage.pageEntry.changes) {
            wrappedMessage.pageEntry.changes.forEach(async function (changes: ChangesEvent) {
              await bankslipDetectionChangesHook(changes);
            });
          }
        } catch (error) {
          console.log('error: ', error)
        }
      }
    });

    await subscriber.subscribe(topic, (topicMessage) => {
      if (topicMessage !== null) {
        console.log('topic:', topicMessage);
      }
      console.log(`Subscribed to redis topic: ${topic}`)
    });
  })();
});

export const processWebhookMessages = async (event: MessagingEvent) => {
  if (event.message) {
    await receivedMessage(event)
  } else if (event.postback) {
    await bankslipDetectionPostbackHook(event);
  } else {
    console.log(`Unable to process received messagingEvent: ${event}`)
  }
}

export const receivedMessage = async (event: MessagingEvent) => {
  if (event.message?.text) {
    await bankslipDetectionMessageHook(event);
  }

  if (event.message?.quick_reply) {
    const quickReplyPayload = event.message.quick_reply.payload
    console.log(`Quick reply with [${quickReplyPayload}]`);
    await bankslipDetectionQuickReplyHook(event);
  }
}