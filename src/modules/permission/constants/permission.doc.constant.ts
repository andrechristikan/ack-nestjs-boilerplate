import { faker } from '@faker-js/faker';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

export const PermissionDocQueryIsActive = [
    {
        name: 'isActive',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const PermissionDocQueryGroup = [
    {
        name: 'group',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: `${ENUM_PERMISSION_GROUP.PERMISSION},${ENUM_PERMISSION_GROUP.ROLE}`,
        description: "group permissions value with ',' delimiter",
    },
];

export const PermissionDocParamsGet = [
    {
        name: 'permissions',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.datatype.uuid(),
    },
];
