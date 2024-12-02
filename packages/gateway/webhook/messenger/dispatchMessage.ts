import { type Request, type Response } from 'express';
import { Snowflake } from "@theinternetfolks/snowflake";
import type { LogFormat, WebhookEntry, WrappedMessage } from '@maximillion/shared/types';
import { getTopic, isEligble, redisClient } from '@maximillion/shared';

export const dispatchMessage = async (req: Request, res: Response) => {
  const data = req.body;
  console.log("received message");
  console.log(data);
  if (data && data.object && data.entry && data.object == 'page' && data.entry !== undefined) {
    data.entry.forEach(async (pageEntry: WebhookEntry) => {  
      if (await isEligble(pageEntry.id)) {
        console.log("eligible");
        const topics = await getTopic(pageEntry.id);
        topics.forEach(async (topic) => {
          const wrappedMessage: WrappedMessage = {
            traceId: Snowflake.generate({timestamp: Date.now()}),
            pageEntry: pageEntry
          };

          console.log(wrappedMessage);
          console.log(`publish message to [${topic}]`, JSON.stringify(wrappedMessage));

          const payload: LogFormat = {
            level: "info",
            module: "gate",
            trace_id: wrappedMessage.traceId,
            message: "[{application}] [{module}] - Request with trace ID {traceId} started"
          }

          // await log(payload);
          await redisClient.publish(topic, JSON.stringify(wrappedMessage));
        });
      }
    });
  }

  res.sendStatus(200);
}
