import { faker } from '@faker-js/faker';

export const ApiKeyDocQueryIsActive = [
    {
        name: 'isActive',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const ApiKeyDocParamsGet = [
    {
        name: 'apiKey',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.datatype.uuid(),
    },
];
