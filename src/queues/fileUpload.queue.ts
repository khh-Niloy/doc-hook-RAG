import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis';

export interface FileUploadJobData {
  documentId: string;
  fileUrl: string;
  filename: string;
}

const redisClient = getRedisClient();

export const fileUploadQueue = new Queue<FileUploadJobData>('file-upload', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      count: 1000,
    },
    removeOnFail: {
      count: 5000,
    },
  },
});
