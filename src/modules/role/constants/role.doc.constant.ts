import { faker } from '@faker-js/faker';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';

export const RoleDocQueryIsActive = [
    {
        name: 'isActive',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const RoleDocQueryType = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_ROLE_TYPE).join(','),
        description: "enum value with ',' delimiter",
    },
];

export const RoleDocParamsId = [
    {
        name: 'role',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];
