import type { z } from 'zod';
import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';

/** @public */
export const WorkspaceSlugRequestSchema = RequestRequiredStringSchema.max(
    100
).meta({
    description: 'Workspace slug, at most 100 characters',
    example: 'acme-team',
});

/** @public */
export type WorkspaceSlugRequestDto = z.infer<
    typeof WorkspaceSlugRequestSchema
>;
