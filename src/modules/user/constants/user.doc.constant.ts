import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { EnumUserStatus } from '@generated/prisma-client/client';

/**
 * Swagger path parameter `userId`.
 * @public
 */
export const UserDocParamsId: ApiParamOptions[] = [
    {
        name: 'userId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger path parameter `mobileNumberId`.
 * @public
 */
export const UserDocParamsMobileNumberId: ApiParamOptions[] = [
    {
        name: 'mobileNumberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger query parameters of the admin user list: `roleId`, `countryId` and `status`.
 * @public
 */
export const UserDocQueryList: ApiQueryOptions[] = [
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
        example: Object.values(EnumUserStatus).join(','),
        description: "value with ',' delimiter",
    },
];
