import { z } from 'zod';

/**
 * Validates the metadata of a workspace invite actor row whose email has no account.
 * @public
 */
export const ActivityLogInviteEmailMetadataSchema = z.strictObject({
    workspaceInviteId: z.string(),
});

/**
 * Metadata of a workspace invite actor row whose email has no account.
 * @public
 */
export type ActivityLogInviteEmailMetadataDto = z.infer<
    typeof ActivityLogInviteEmailMetadataSchema
>;
