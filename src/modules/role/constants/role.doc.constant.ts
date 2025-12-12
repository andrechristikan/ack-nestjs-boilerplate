import { faker } from '@faker-js/faker';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { EnumRoleType } from '@prisma/client';

export const RoleDocParamsId: ApiParamOptions[] = [
    {
        name: 'roleId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

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
