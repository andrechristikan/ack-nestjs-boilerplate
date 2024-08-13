import { faker } from '@faker-js/faker';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

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

export const ApiKeyDocQueryType = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_API_KEY_TYPE).join(','),
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
