import { faker } from '@faker-js/faker';
import { ApiParamOptions } from '@nestjs/swagger';

export const DeviceOwnershipDocParamsId: ApiParamOptions[] = [
    {
        name: 'deviceOwnershipId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
