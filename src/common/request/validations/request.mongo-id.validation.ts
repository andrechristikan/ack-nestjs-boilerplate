import { faker } from '@faker-js/faker';
import { z } from 'zod';

export const RequestMongoIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .meta({
        description: 'MongoDB ObjectId',
        example: faker.database.mongodbObjectId(),
    });
