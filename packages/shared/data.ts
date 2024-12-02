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
    const query = "SELECT ref_id FROM merchant_channel WHERE ref_type = 'FACEBOOK_PAGE' and ref_id = $1"
    const result = await db_pool.query(query, [page_id]);
    
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    return false;
  }
}

export const getTopic = async (page_id: string): Promise<string[]> => {
  try {
    const data: string[] = [];
    const query = "SELECT ap.topic as topic FROM merchant_channel mc INNER JOIN application_registry ar ON ar.channel_id = mc.id INNER JOIN application ap ON ar.app_id = ap.id WHERE mc.ref_type = 'FACEBOOK_PAGE' AND mc.ref_id = $1";
    const result = await db_pool.query(query, [page_id]);    
    
    result.rows.forEach((row: any) => {
      data.push(row.topic)
    })
    
    return data;
  } catch (err) {
    return [];
  }
}

export const genChannelData = async (channel_type: string, page_id: string) => {
  try {
    const cacheKey = `FEMTO_${channel_type}_${page_id}`;
    const cachedData = await redisCache.getItem<string>(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
  }

    const query = "SELECT ref_type, token, name FROM merchant_channel mc WHERE mc.ref_type = 'FACEBOOK_PAGE' AND mc.ref_id = $1"
    const result = await db_pool.query(query, [page_id]);    
    const config = result.rows[0];

    await redisCache.setItem(cacheKey, JSON.stringify(config), {isCachedForever: true});
    return config;
  } catch (err) {
    return [];
  }  
}

export const genOrderId = async (shop_id: string): Promise<string> => {
  try {
    const query = "UPDATE sequencers SET data = data + 1 WHERE name = $1 RETURNING data";
    const result = await db_pool.query(query, [shop_id]);    

    const row = result.rows[0];
    
    return row.data.toString().padStart(5, '0');
  } catch (err) {
    console.log(err);
    return "XXXXX";
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