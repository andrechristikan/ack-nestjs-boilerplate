import { faker } from '@faker-js/faker';
import type { ApiParamOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `notificationId`.
 * @public
 */
export const NotificationDocParamsId: ApiParamOptions[] = [
    {
        name: 'notificationId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
