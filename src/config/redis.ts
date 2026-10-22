import Redis from 'ioredis';
import { envVars } from './envVars';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const redisUrl = envVars.REDIS_URL;

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected successfully');
    });

    redisClient.on('error', (error) => {
      console.error('Redis connection error:', { error });
    });
  }
  return redisClient;
};

export const connectRedis = async (): Promise<Redis> => {
  const client = getRedisClient();
  if (client.status === 'wait' || client.status === 'close') {
    await client.connect();
  }
  return client;
};
