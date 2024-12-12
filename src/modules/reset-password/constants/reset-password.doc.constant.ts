import { faker } from '@faker-js/faker';

export const ResetPasswordDocParamsToken = [
    {
        name: 'token',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.alphanumeric(),
    },
];
