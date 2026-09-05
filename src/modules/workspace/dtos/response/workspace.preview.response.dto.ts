import { z } from 'zod';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';

/**
 * Public workspace profile resolved by slug for an unauthenticated caller. Every audit column
 * naming a user is dropped, so a guessable slug reveals nothing about who runs the workspace.
 */
export const WorkspacePreviewResponseSchema = WorkspaceResponseSchema.pick({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    name: true,
    slug: true,
    description: true,
});

export type WorkspacePreviewResponseDto = z.infer<
    typeof WorkspacePreviewResponseSchema
>;
