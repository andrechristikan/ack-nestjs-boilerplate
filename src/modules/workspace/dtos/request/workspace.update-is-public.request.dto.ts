import { z } from 'zod';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';

export const WorkspaceUpdateIsPublicRequestSchema =
    WorkspaceResponseSchema.pick({ isPublic: true }).strict();

export type WorkspaceUpdateIsPublicRequestDto = z.infer<
    typeof WorkspaceUpdateIsPublicRequestSchema
>;
