import { faker } from '@faker-js/faker';
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

export const UserDocQueryRole = [
    {
        name: 'role',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.string.uuid(),
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
