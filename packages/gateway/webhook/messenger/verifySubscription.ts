import type { Request, Response, Router } from 'express';

// Messenger Verify Webhook Subscription
export const verifySubscription = (req: Request, res: Response) => {
  const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? "";

  // Verify token not exist, abort request
  if (verifyToken === "") {
    res.status(405).send("VERIFY_TOKEN not set").end();
    return;
  }
  
  // Verify Facebook Webhook Subscriptions
  if (req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === verifyToken) {
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
}
