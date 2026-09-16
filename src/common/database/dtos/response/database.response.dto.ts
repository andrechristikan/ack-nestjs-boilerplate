import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Base response shape with the audit fields (id, timestamps, soft-delete) on every document.
 */
export const DatabaseResponseSchema = z.object({
    id: z.string().meta({
        description: 'Database document identifier',
        example: faker.database.mongodbObjectId(),
    }),
    createdAt: z.date().meta({
        description: 'Date created at',
        example: faker.date.recent(),
    }),
    createdBy: z.string().nullable().meta({
        description: 'created by',
        example: faker.database.mongodbObjectId(),
    }),
    updatedAt: z.date().meta({
        description: 'Date updated at',
        example: faker.date.recent(),
    }),
    updatedBy: z.string().nullable().meta({
        description: 'updated by',
        example: faker.database.mongodbObjectId(),
    }),
    deletedAt: z.date().nullable().meta({
        description: 'Date delete at',
        example: faker.date.recent(),
    }),
    deletedBy: z.string().nullable().meta({
        description: 'Delete by',
        example: faker.database.mongodbObjectId(),
    }),
});

export type DatabaseResponseDto = z.infer<typeof DatabaseResponseSchema>;
