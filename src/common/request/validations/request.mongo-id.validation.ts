import { RequestMongoIdRegex } from '@common/request/constants/request.constant';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

/** @public */
export const RequestMongoIdSchema = z
    .string()
    .length(24)
    .regex(RequestMongoIdRegex)
    .meta({
        description: 'MongoDB ObjectId',
        example: faker.database.mongodbObjectId(),
    });
