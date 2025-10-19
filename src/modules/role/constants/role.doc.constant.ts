import { faker } from '@faker-js/faker';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ENUM_ROLE_TYPE } from '@prisma/client';

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
        example: Object.values(ENUM_ROLE_TYPE).join(','),
        description: `enum value with ',' delimiter. Available values: ${Object.values(ENUM_ROLE_TYPE).join(',')}`,
    },
];
