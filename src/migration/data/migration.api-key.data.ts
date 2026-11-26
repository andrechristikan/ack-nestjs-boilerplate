import { EnumAppEnvironment } from '@app/enums/app.enum';
import type { ApiKeyCreateRawRequestDto } from '@modules/api-key/dtos/request/api-key.create-raw.request.dto';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { IMigrationEnvironmentData } from '@migration/interfaces/migration.interface';

export const MigrationApiKeyData: IMigrationEnvironmentData<
    ApiKeyCreateRawRequestDto[]
> = {
    [EnumAppEnvironment.local]: [
        {
            name: 'api key default',
            type: EnumApiKeyType.default,
            key: 'fyFGb7ywyM37TqDY8nuhAmGW5',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
        {
            name: 'api key system',
            type: EnumApiKeyType.system,
            key: 'UTDH0fuDMAbd1ZVnwnyrQJd8Q',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
    ],
    [EnumAppEnvironment.development]: [],
    [EnumAppEnvironment.staging]: [],
    [EnumAppEnvironment.production]: [],
};
