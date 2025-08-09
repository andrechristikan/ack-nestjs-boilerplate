import { faker } from '@faker-js/faker';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';

export const ApiKeyDocQueryList = [
    {
        name: 'isActive',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
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
