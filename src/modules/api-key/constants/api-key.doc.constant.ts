import { faker } from '@faker-js/faker';
import { ENUM_API_KEY_TYPE } from '@prisma/client';

export const ApiKeyDocQueryList = [
    {
        name: 'isActive',
        allowEmptyValue: true,
        required: false,
        type: 'boolean',
        example: true,
        description: 'boolean value. Available values: true, false.',
    },
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_API_KEY_TYPE).join(','),
        description: `enum value with ',' delimiter. Available values: ${Object.values(ENUM_API_KEY_TYPE).join(', ')}`,
    },
];

export const ApiKeyDocParamsId = [
    {
        name: 'apiKey',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
