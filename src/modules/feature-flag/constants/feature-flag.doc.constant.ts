import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `featureFlagId`.
 * @public
 */
export const FeatureFlagDocParamsId: ApiParamOptions[] = [
    {
        name: 'featureFlagId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

/**
 * Swagger query parameters of the feature-flag lists: `key`.
 * @public
 */
export const FeatureFlagDocQueryList: ApiQueryOptions[] = [
    {
        name: 'key',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        description: 'Filter by feature flag key',
    },
];
