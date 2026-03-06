import { faker } from '@faker-js/faker';
import { ApiParamOptions } from '@nestjs/swagger';

export const DeviceDocParamsId: ApiParamOptions[] = [
    {
        name: 'deviceId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
