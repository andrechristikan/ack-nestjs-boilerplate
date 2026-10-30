import { Injectable } from '@nestjs/common';
import { EnumApiKeyType } from '@generated/prisma-client/client';
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

    isActive(apiKey: IApiKey): boolean {
        return apiKey.isActive;
    }

    isExpired(endAt: Date | null, currentDate: Date): boolean {
        return endAt !== null && currentDate > endAt;
    }

    isNotYetActive(startAt: Date | null, currentDate: Date): boolean {
        return startAt !== null && currentDate < startAt;
    }

    validateType(
        apiKey: { type: EnumApiKeyType },
        allowed: EnumApiKeyType[]
    ): boolean {
        return allowed.includes(apiKey.type);
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
