import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumUserStatus } from '@generated/prisma-client/client';

/**
 * Query filter for the admin user export.
 * @public
 */
export const UserExportRequestSchema = z.strictObject({
    status: z
        .string()
        .optional()
        .meta({
            description: "value with ',' delimiter",
            example: Object.values(EnumUserStatus).join(','),
        }),
    roleId: z.string().optional().meta({
        description: 'Filter by roleId',
        example: faker.database.mongodbObjectId(),
    }),
    countryId: z.string().optional().meta({
        description: 'Filter by countryId',
        example: faker.database.mongodbObjectId(),
    }),
});

/**
 * Inferred DTO for UserExportRequestSchema.
 * @public
 */
export type UserExportRequestDto = z.infer<typeof UserExportRequestSchema>;
