import { faker } from '@faker-js/faker';
import { ENUM_ROLE_TYPE } from '@prisma/client';

export const RoleDocQueryList = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_ROLE_TYPE).join(','),
        description: `enum value with ',' delimiter. Available values: ${Object.values(ENUM_ROLE_TYPE).join(',')}`,
    },
];

export const RoleDocParamsId = [
    {
        name: 'roleId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];
