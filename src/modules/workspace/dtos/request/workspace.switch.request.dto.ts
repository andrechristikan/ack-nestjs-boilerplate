import { z } from 'zod';
import { faker } from '@faker-js/faker';

export const WorkspaceSwitchRequestSchema = z.strictObject({
    workspaceId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .meta({
            description:
                'Workspace to switch into; caller must already be a member',
            example: faker.database.mongodbObjectId(),
        }),
});

export type WorkspaceSwitchRequestDto = z.infer<
    typeof WorkspaceSwitchRequestSchema
>;
