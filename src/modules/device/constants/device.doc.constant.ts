import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `deviceOwnershipId`.
 * @public
 */
export const DeviceOwnershipDocParamsId: ApiParamOptions[] = [
    {
        name: 'deviceOwnershipId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

/**
 * Swagger query parameters of the admin device list: `isRevoked`.
 * @public
 */
export const DeviceOwnershipDocQueryList: ApiQueryOptions[] = [
    {
        name: 'isRevoked',
        allowEmptyValue: true,
        required: false,
        type: 'boolean',
        example: true,
    },
];
