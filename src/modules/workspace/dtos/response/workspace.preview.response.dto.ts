import { z } from 'zod';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';

/** @public */
export const WorkspacePreviewResponseSchema = WorkspaceResponseSchema.pick({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    name: true,
    slug: true,
    description: true,
});

/** @public */
export type WorkspacePreviewResponseDto = z.infer<
    typeof WorkspacePreviewResponseSchema
>;
