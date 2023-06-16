import { faker } from '@faker-js/faker';

export const UserDocQueryIsActive = [
    {
        name: 'isActive',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const UserDocQueryBlocked = [
    {
        name: 'blocked',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const UserDocQueryInactivePermanent = [
    {
        name: 'inactivePermanent',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
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

export const UserDocParamsId = [
    {
        name: 'user',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];
