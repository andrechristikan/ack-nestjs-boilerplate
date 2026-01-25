import { faker } from '@faker-js/faker';
import { ApiParamOptions } from '@nestjs/swagger';

export const NotificationDocParamsId: ApiParamOptions[] = [
    {
        name: 'notificationId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
