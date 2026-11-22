import { ActivityLogInviteEmailMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-email-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogInviteAccountMetadataSchema =
    ActivityLogInviteEmailMetadataSchema.extend({
        targetUserId: z.string(),
    });

/** @public */
export type ActivityLogInviteAccountMetadataDto = z.infer<
    typeof ActivityLogInviteAccountMetadataSchema
>;
