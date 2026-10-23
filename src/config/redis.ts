import Redis from 'ioredis';
import { envVars } from './envVars';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const redisUrl = envVars.REDIS_URL;

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected successfully');
    });

    redisClient.on('error', (error) => {
      console.warn('Redis connection warning:', error.message);
    });
  }
  return redisClient;
};

export const connectRedis = async (): Promise<Redis | null> => {
  try {
    const client = getRedisClient();
    if (client.status === 'wait' || client.status === 'close') {
      await client.connect();
    }
    return client;
  } catch (error) {
    console.warn(
      'Redis connection failed, continuing without blocking server:',
      error,
    );
    return null;
  }
};
