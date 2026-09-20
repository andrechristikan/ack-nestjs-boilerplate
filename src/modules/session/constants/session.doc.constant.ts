import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `sessionId`.
 * @public
 */
export const SessionDocParamsId: ApiParamOptions[] = [
    {
        name: 'sessionId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger query parameters of the admin session list: `isRevoked`.
 * @public
 */
export const SessionDocQueryList: ApiQueryOptions[] = [
    {
        name: 'isRevoked',
        allowEmptyValue: true,
        required: false,
        type: 'boolean',
        example: true,
        description: 'Filter by revoked session. Omit to return both',
    },
];
