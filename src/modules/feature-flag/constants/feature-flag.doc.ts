import { faker } from '@faker-js/faker';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

export const FeatureFlagDocParamsId: ApiParamOptions[] = [
    {
        name: 'featureFlagId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const FeatureFlagDocQueryList: ApiQueryOptions[] = [
    {
        name: 'key',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        description: 'Filter by feature flag key',
    },
];
