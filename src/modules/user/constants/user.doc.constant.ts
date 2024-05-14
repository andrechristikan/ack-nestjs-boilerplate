import { faker } from '@faker-js/faker';
import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';

export const UserDocParamsId = [
    {
        name: 'user',
        allowEmptyValue: false,
        required: true,
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
        example: Object.values(ENUM_USER_STATUS),
        description: "value with ',' delimiter",
    },
];

export const UserDocQueryBlocked = [
    {
        name: 'blocked',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "value with ',' delimiter",
    },
];

export const UserDocQuerySignUpDate = [
    {
        name: 'startDate',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.date.past(),
    },
    {
        name: 'endDate',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.date.recent(),
    },
];
