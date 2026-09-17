import { faker } from '@faker-js/faker';
import type { ApiParamOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `roleId`.
 * @public
 */
export const PolicyDocParamsRoleId: ApiParamOptions[] = [
    {
        name: 'roleId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

/**
 * Swagger path parameter `policyId`.
 * @public
 */
export const PolicyDocParamsId: ApiParamOptions[] = [
    {
        name: 'policyId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
