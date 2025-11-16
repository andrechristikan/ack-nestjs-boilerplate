import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { ApiKeyCreateRawRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ENUM_API_KEY_TYPE } from '@prisma/client';

export const migrationApiKeyData: Record<
    ENUM_APP_ENVIRONMENT,
    ApiKeyCreateRawRequestDto[]
> = {
    [ENUM_APP_ENVIRONMENT.LOCAL]: [
        {
            name: 'Api Key Default',
            type: ENUM_API_KEY_TYPE.default,
            key: 'fyFGb7ywyM37TqDY8nuhAmGW5',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
        {
            name: 'Api Key System',
            type: ENUM_API_KEY_TYPE.system,
            key: 'UTDH0fuDMAbd1ZVnwnyrQJd8Q',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
    ],
    [ENUM_APP_ENVIRONMENT.DEVELOPMENT]: [],
    [ENUM_APP_ENVIRONMENT.STAGING]: [],
    [ENUM_APP_ENVIRONMENT.PRODUCTION]: [],
};
