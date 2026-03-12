import { faker } from '@faker-js/faker';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

export const SessionDocParamsId: ApiParamOptions[] = [
    {
        name: 'sessionId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const SessionDocQueryList: ApiQueryOptions[] = [
    {
        name: 'isRevoked',
        allowEmptyValue: true,
        required: false,
        type: 'boolean',
        example: true,
    },
];
