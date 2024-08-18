import { faker } from '@faker-js/faker';

export const SessionDocParamsId = [
    {
        name: 'session',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];
