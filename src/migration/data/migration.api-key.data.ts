import { EnumAppEnvironment } from '@app/enums/app.enum';
import { ApiKeyCreateRawRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { EnumApiKeyType } from '@prisma/client';

export const migrationApiKeyData: Record<
    EnumAppEnvironment,
    ApiKeyCreateRawRequestDto[]
> = {
    [EnumAppEnvironment.local]: [
        {
            name: 'Api Key Default',
            type: EnumApiKeyType.default,
            key: 'fyFGb7ywyM37TqDY8nuhAmGW5',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
        {
            name: 'Api Key System',
            type: EnumApiKeyType.system,
            key: 'UTDH0fuDMAbd1ZVnwnyrQJd8Q',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
    ],
    [EnumAppEnvironment.development]: [],
    [EnumAppEnvironment.staging]: [],
    [EnumAppEnvironment.production]: [],
};
