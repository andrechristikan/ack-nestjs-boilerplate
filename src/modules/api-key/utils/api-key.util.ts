import { Injectable } from '@nestjs/common';
import type {
    IApiKey,
    IApiKeyActivityLogSubject,
    IApiKeyCreated,
} from '@modules/api-key/interfaces/api-key.interface';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

@Injectable()
export class ApiKeyUtil {
    mapCreate(apiKey: IApiKey, secret: string): IApiKeyCreated {
        return {
            ...apiKey,
            secret,
        };
    }

    mapActivityLogMetadata(
        apiKey: IApiKeyActivityLogSubject,
        timestamp: Date
    ): IActivityLogMetadata {
        return {
            apiKeyId: apiKey.id,
            apiKeyName: apiKey.name,
            apiKeyType: apiKey.type,
            timestamp,
        };
    }
}
