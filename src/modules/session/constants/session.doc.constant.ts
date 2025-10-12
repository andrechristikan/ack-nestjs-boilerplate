import { faker } from '@faker-js/faker';

export const SessionDocParamsId = [
    {
        name: 'sessionId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
