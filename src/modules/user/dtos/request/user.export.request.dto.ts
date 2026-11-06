import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { EnumUserStatus } from '@generated/prisma-client/client';

/** @public */
export const UserExportRequestSchema = z.strictObject({
    status: z
        .string()
        .optional()
        .meta({
            description: "value with ',' delimiter",
            example: Object.values(EnumUserStatus).join(','),
        }),
    roleId: RequestMongoIdSchema.optional().meta({
        description: 'Filter by roleId',
        example: faker.database.mongodbObjectId(),
    }),
    countryId: RequestMongoIdSchema.optional().meta({
        description: 'Filter by countryId',
        example: faker.database.mongodbObjectId(),
    }),
});

/** @public */
export type UserExportRequestDto = z.infer<typeof UserExportRequestSchema>;
