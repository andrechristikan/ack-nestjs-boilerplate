import { faker } from '@faker-js/faker';
import { z } from 'zod';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { ActivityLogAdminListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';

/** @public */
export const ActivityLogAdminWorkspaceListRequestSchema =
    ActivityLogAdminListRequestSchema.extend({
        userId: RequestUuidSchema.optional().meta({
            description: 'Only the activity of this user',
            example: faker.string.uuid(),
        }),
    });

/** @public */
export type ActivityLogAdminWorkspaceListRequestDto = z.infer<
    typeof ActivityLogAdminWorkspaceListRequestSchema
>;
