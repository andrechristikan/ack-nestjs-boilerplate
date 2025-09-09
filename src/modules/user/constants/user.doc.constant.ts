import { faker } from '@faker-js/faker';
import { ENUM_USER_STATUS } from '@prisma/client';

export const UserDocParamsId = [
    {
        name: 'userId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

export const UserDocQueryList = [
    {
        name: 'roleId',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.string.uuid(),
        description: 'Filter by roleId',
    },
    {
        name: 'countryId',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.string.uuid(),
    },
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_USER_STATUS).join(','),
        description: "value with ',' delimiter",
    },
];
