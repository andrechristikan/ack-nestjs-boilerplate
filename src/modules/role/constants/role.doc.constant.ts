import { faker } from '@faker-js/faker';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';

export const RoleDocQueryActiveList = [
    {
        name: 'isActive',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description:
            "boolean value with ',' delimiter. Available values: true, false.",
    },
];

export const RoleDocQueryList = [
    ...RoleDocQueryActiveList,
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_POLICY_ROLE_TYPE).join(','),
        description: `enum value with ',' delimiter. Available values: ${Object.values(ENUM_POLICY_ROLE_TYPE).join(',')}`,
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
