import { faker } from '@faker-js/faker';
import { ApiParamOptions } from '@nestjs/swagger';

export const TenantDocParamsId: ApiParamOptions[] = [
    {
        name: 'tenantId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const TenantDocParamsMemberId: ApiParamOptions[] = [
    {
        name: 'memberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
