import { faker } from '@faker-js/faker';
import { ApiParamOptions } from '@nestjs/swagger';

export const PolicyDocParamsRoleId: ApiParamOptions[] = [
    {
        name: 'roleId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

export const PolicyDocParamsId: ApiParamOptions[] = [
    {
        name: 'policyId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];
