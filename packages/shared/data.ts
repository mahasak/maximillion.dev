import { Pool } from "pg";
import dotenv from 'dotenv';
import type { P2MSessionData } from "./types";
import { redisCache } from "./cache";
dotenv.config();

export const db_pool = new Pool({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT === undefined ? 5432 : parseInt(process.env.POSTGRES_PORT),
  idleTimeoutMillis: 30000,
});

export const isEligble = async (page_id: string) => {
  console.log('checking eligibility');
  try {
    const query = "select ref_id from merchant_channel where ref_type = 'FACEBOOK_PAGE' and ref_id = $1"
    const result = await db_pool.query(query, [page_id]);
    
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    return false;
  }
}

export const getTopic = async (page_id: string): Promise<string[]> => {
  try {
    const data: string[] = [];
    const query = "select ap.topic as topic from merchant_channel mc inner join application_registry ar on ar.channel_id = mc.id inner join application ap on ar.app_id = ap.id where mc.ref_type = 'FACEBOOK_PAGE' and mc.ref_id = $1";
    const result = await db_pool.query(query, [page_id]);    
    
    result.rows.forEach((row: any) => {
      data.push(row.topic)
    })
    
    return data;
  } catch (err) {
    return [];
  }
}

export const clearChannelCache =  async (channel_type: string, page_id: string) => {
  const cacheKey = `FEMTO_${channel_type}_${page_id}`;
  await redisCache.setItem(cacheKey,undefined,{ttl:0,isCachedForever: false, isLazy: false})
}

export const setCurrentOrderId = async (psid: string, order_id: string, invoice_id: string) => {
  const session: P2MSessionData = {
    order_id: order_id,
    invoice_id: invoice_id
  }

  await redisCache.setItem(`P2M:${psid}`, session, { isCachedForever: true });
}

export const getCurrentOrderId = async (psid: string) => {
  const cachedUsers = await redisCache.getItem<P2MSessionData>(`P2M:${psid}`)
  if (cachedUsers) {
    return cachedUsers
  }

  return {
    order_id: "",
    invoice_id: ""
  }
}