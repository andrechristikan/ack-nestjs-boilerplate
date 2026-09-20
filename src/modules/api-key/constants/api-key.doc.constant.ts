import { EnumApiKeyType } from '@generated/prisma-client/client';
import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `apiKeyId`.
 * @public
 */
export const ApiKeyDocParamsId: ApiParamOptions[] = [
    {
        name: 'apiKeyId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger query parameters of the admin API key list: `isActive` and `type`.
 * @public
 */
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
