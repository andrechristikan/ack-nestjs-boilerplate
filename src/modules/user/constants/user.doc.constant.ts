import { faker } from '@faker-js/faker';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ENUM_USER_STATUS } from '@prisma/client';

export const UserDocParamsId: ApiParamOptions[] = [
    {
        name: 'userId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const UserDocParamsMobileNumberId: ApiParamOptions[] = [
    {
        name: 'mobileNumberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const UserDocQueryList: ApiQueryOptions[] = [
    {
        name: 'roleId',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.database.mongodbObjectId(),
        description: 'Filter by roleId',
    },
    {
        name: 'countryId',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.database.mongodbObjectId(),
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
