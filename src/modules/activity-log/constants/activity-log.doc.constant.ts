import { faker } from '@faker-js/faker';
import type { ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger query parameters of the admin activity-log list by workspace.
 * @public
 */
export const ActivityLogDocQueryListByWorkspace: ApiQueryOptions[] = [
    {
        name: 'userId',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.database.mongodbObjectId(),
        description: 'Filter by userId',
    },
];
