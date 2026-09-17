import { z } from 'zod';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';

/**
 * Validates the body for changing workspace visibility.
 * @public
 */
export const WorkspaceUpdateIsPublicRequestSchema =
    WorkspaceResponseSchema.pick({ isPublic: true }).strict();

/**
 * Body for changing workspace visibility.
 * @public
 */
export type WorkspaceUpdateIsPublicRequestDto = z.infer<
    typeof WorkspaceUpdateIsPublicRequestSchema
>;
