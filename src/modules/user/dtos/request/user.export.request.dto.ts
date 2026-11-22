import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumUserStatus } from '@generated/prisma-client/client';

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
        example: faker.string.uuid(),
    }),
    countryId: z.string().optional().meta({
        description: 'Filter by countryId',
        example: faker.string.uuid(),
    }),
});

export type UserExportRequestDto = z.infer<typeof UserExportRequestSchema>;
