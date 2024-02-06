import { faker } from '@faker-js/faker';

export const DashboardDocQueryDate = [
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
