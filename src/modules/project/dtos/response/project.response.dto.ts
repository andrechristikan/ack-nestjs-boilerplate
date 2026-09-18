import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

/**
 * Base project shape: the stored project row.
 */
export const ProjectResponseSchema = DatabaseResponseSchema.omit({
    deletedBy: true,
}).extend({
    workspaceId: z.string().meta({
        description: 'Identifier of the workspace the project belongs to',
        example: faker.string.uuid(),
    }),
    name: z.string().meta({
        description: 'Project name',
        example: 'Website Revamp',
    }),
    slug: z.string().meta({
        description: 'Project slug',
        example: 'website-revamp',
    }),
    description: z.string().nullable().meta({
        description: 'Project description',
        example: 'Marketing site redesign',
    }),
});

export type ProjectResponseDto = z.infer<typeof ProjectResponseSchema>;
