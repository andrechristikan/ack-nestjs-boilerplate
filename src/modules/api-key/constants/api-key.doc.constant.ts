import { faker } from '@faker-js/faker';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { EnumApiKeyType } from '@prisma/client';

export const ApiKeyDocParamsId: ApiParamOptions[] = [
    {
        name: 'apiKeyId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const ApiKeyDocQueryList: ApiQueryOptions[] = [
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
        example: Object.values(EnumApiKeyType).join(','),
        description: `enum value with ',' delimiter. Available values: ${Object.values(EnumApiKeyType).join(', ')}`,
    },
];
