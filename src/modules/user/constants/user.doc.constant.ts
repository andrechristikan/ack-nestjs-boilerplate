import { faker } from '@faker-js/faker';

export const UserDocQueryIsActive = [
    {
        name: 'isActive',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const UserDocParamsGet = [
    {
        name: 'user',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.datatype.uuid(),
    },
];
