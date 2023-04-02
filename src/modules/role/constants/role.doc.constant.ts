import { faker } from '@faker-js/faker';
import { ENUM_AUTH_TYPE } from 'src/common/auth/constants/auth.enum.constant';

export const RoleDocQueryIsActive = [
    {
        name: 'isActive',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const RoleDocQueryType = [
    {
        name: 'type',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: Object.values(ENUM_AUTH_TYPE).join(','),
        description: "enum value with ',' delimiter",
    },
];

export const RoleDocParamsGet = [
    {
        name: 'role',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.datatype.uuid(),
    },
];
