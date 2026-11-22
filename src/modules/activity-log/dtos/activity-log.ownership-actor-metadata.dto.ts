import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogOwnershipActorMetadataSchema =
    ActivityLogActorMetadataSchema.extend({
        workspaceId: z.string(),
        previousOwnerUserId: z.string(),
    });

/** @public */
export type ActivityLogOwnershipActorMetadataDto = z.infer<
    typeof ActivityLogOwnershipActorMetadataSchema
>;
