import { faker } from '@faker-js/faker';
import { ApiQueryOptions } from '@nestjs/swagger';

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
