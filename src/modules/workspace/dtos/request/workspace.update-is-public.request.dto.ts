import { z } from 'zod';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';

/** @public */
export const WorkspaceUpdateIsPublicRequestSchema =
    WorkspaceResponseSchema.pick({ isPublic: true }).strict();

/** @public */
export type WorkspaceUpdateIsPublicRequestDto = z.infer<
    typeof WorkspaceUpdateIsPublicRequestSchema
>;
