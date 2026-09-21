import { ActivityLogInviteEmailMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-email-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of a workspace invite actor row whose email belongs to an account.
 * @public
 */
export const ActivityLogInviteAccountMetadataSchema =
    ActivityLogInviteEmailMetadataSchema.extend({
        targetUserId: z.string(),
    });

/**
 * Metadata of a workspace invite actor row whose email belongs to an account.
 * @public
 */
export type ActivityLogInviteAccountMetadataDto = z.infer<
    typeof ActivityLogInviteAccountMetadataSchema
>;
