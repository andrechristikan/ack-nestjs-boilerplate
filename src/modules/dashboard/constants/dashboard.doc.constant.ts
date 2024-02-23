import { faker } from '@faker-js/faker';
import { ENUM_DASHBOARD_DAY } from 'src/modules/dashboard/constants/dashboard.enum.constant';

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

export const DashboardDocQueryDay = [
    {
        name: 'day',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: ENUM_DASHBOARD_DAY.LAST_WEEK,
        enum: ENUM_DASHBOARD_DAY,
        description: "value with ',' delimiter",
    },
];
