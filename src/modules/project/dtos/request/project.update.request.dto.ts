import { z } from 'zod';

export const ProjectUpdateRequestSchema = z.strictObject({
    name: z.string().max(150).optional().meta({
        description: 'Project name',
        example: 'Website Revamp',
    }),
    description: z.string().max(500).optional().meta({
        description: 'Project description',
        example: 'Marketing site redesign',
    }),
});

export type ProjectUpdateRequestDto = z.infer<
    typeof ProjectUpdateRequestSchema
>;
