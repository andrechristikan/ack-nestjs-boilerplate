import { EnumRoleType } from '@generated/prisma-client/client';
import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `roleId`.
 * @public
 */
export const RoleDocParamsId: ApiParamOptions[] = [
    {
        name: 'roleId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger query parameters of the role lists: `type`.
 * @public
 */
export const RoleDocQueryList: ApiQueryOptions[] = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(EnumRoleType).join(','),
        description: `enum value with ',' delimiter. Available values: ${Object.values(EnumRoleType).join(',')}`,
    },
];
