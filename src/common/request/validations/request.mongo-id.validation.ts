import { faker } from '@faker-js/faker';
import { z } from 'zod';

/**
 * MongoDB ObjectId as a 24-character hex string.
 * @public
 */
export const RequestMongoIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .meta({
        description: 'MongoDB ObjectId',
        example: faker.database.mongodbObjectId(),
    });
