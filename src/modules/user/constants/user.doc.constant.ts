import { faker } from '@faker-js/faker';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';

export const UserDocParamsId = [
    {
        name: 'user',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

export const UserDocQueryRoleType = [
    {
        name: 'roleType',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_POLICY_ROLE_TYPE).join(','),
        description: "value with ',' delimiter",
    },
];

export const UserDocQueryCountry = [
    {
        name: 'country',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.string.uuid(),
    },
];

export const UserDocQueryStatus = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_USER_STATUS).join(','),
        description: "value with ',' delimiter",
    },
];
