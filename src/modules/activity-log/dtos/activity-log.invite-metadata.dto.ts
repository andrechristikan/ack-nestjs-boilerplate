import { ActivityLogInviteAccountMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-account-metadata.dto';
import { ActivityLogInviteEmailMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-email-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogInviteMetadataSchema = z.union([
    ActivityLogInviteAccountMetadataSchema,
    ActivityLogInviteEmailMetadataSchema,
]);

/** @public */
export type ActivityLogInviteMetadataDto = z.infer<
    typeof ActivityLogInviteMetadataSchema
>;
