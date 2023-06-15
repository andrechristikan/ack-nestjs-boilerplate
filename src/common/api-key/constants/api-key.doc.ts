import { faker } from '@faker-js/faker';

export const ApiKeyDocQueryIsActive = [
    {
        name: 'isActive',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const ApiKeyDocParamsId = [
    {
        name: 'apiKey',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];
