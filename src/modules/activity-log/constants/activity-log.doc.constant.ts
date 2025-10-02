import { faker } from '@faker-js/faker';

export const ActivityLogDocQueryList = [
    {
        name: 'userId',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.database.mongodbObjectId(),
        description: 'Filter by userId',
    },
];
