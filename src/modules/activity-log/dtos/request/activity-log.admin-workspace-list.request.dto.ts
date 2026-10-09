import { faker } from '@faker-js/faker';
import { z } from 'zod';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { ActivityLogAdminListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';

/**
 * Activity Log Admin Workspace List Request schema: the admin list query plus an optional user filter.
 * @public
 */
export const ActivityLogAdminWorkspaceListRequestSchema =
    ActivityLogAdminListRequestSchema.extend({
        userId: RequestMongoIdSchema.optional().meta({
            description: 'Only the activity of this user',
            example: faker.database.mongodbObjectId(),
        }),
    });

/**
 * Inferred DTO for ActivityLogAdminWorkspaceListRequestSchema.
 * @public
 */
export type ActivityLogAdminWorkspaceListRequestDto = z.infer<
    typeof ActivityLogAdminWorkspaceListRequestSchema
>;
