import { ActivityLogInviteAccountMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-account-metadata.dto';
import { ActivityLogInviteEmailMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-email-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of a workspace invite actor row, with or without an existing account.
 * @public
 */
export const ActivityLogInviteMetadataSchema = z.union([
    ActivityLogInviteAccountMetadataSchema,
    ActivityLogInviteEmailMetadataSchema,
]);

/**
 * Metadata of a workspace invite actor row.
 * @public
 */
export type ActivityLogInviteMetadataDto = z.infer<
    typeof ActivityLogInviteMetadataSchema
>;
