import { faker } from '@faker-js/faker';
import { z } from 'zod';

/** @public */
export const RequestMongoIdSchema = z
    .string()
    .length(24)
    .regex(/^[0-9a-fA-F]+$/)
    .meta({
        description: 'MongoDB ObjectId',
        example: faker.database.mongodbObjectId(),
    });
