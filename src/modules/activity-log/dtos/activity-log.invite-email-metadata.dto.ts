import { z } from 'zod';

/** @public */
export const ActivityLogInviteEmailMetadataSchema = z.strictObject({
    workspaceInviteId: z.string(),
});

/** @public */
export type ActivityLogInviteEmailMetadataDto = z.infer<
    typeof ActivityLogInviteEmailMetadataSchema
>;
