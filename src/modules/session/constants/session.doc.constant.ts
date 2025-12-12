import { faker } from '@faker-js/faker';
import { ApiParamOptions } from '@nestjs/swagger';

export const SessionDocParamsId: ApiParamOptions[] = [
    {
        name: 'sessionId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
