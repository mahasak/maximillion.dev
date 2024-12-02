import express, { type Express, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { Snowflake } from "@theinternetfolks/snowflake";
dotenv.config();
import { clearChannelCache } from '@maximillion/shared'

import { messengerRoutes } from './webhook/messenger/routes';

const app: Express = express();
const port = process.env.PORT ?? 8080;
app.use(express.json())

app.get('/', async (req: Request, res: Response) => {
  const response = {
    req_id: Snowflake.generate({ timestamp: Date.now() }),
    message: 'Femto Gate Server'
  }
  res.send(response);
});

app.post('/reset_config', async (req: Request, res: Response) => {
  const channel = req.body.channel ?? "";
  const channel_id = req.body.channel_id ?? "";

  if (channel !== "" && channel_id !== "") {
    await clearChannelCache(channel, channel_id)
  }

  res.send({ result: true });
});

app.use(messengerRoutes);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
