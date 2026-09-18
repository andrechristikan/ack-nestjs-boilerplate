import { Injectable } from '@nestjs/common';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type { IApiKeyCreated } from '@modules/api-key/interfaces/api-key.interface';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

@Injectable()
export class ApiKeyUtil {
    mapCreate(apiKey: ApiKey, secret: string): IApiKeyCreated {
        return {
            ...apiKey,
            secret,
        };
    }

    isExpired(
        apiKey: {
            startAt?: Date | null;
            endAt?: Date | null;
        },
        currentDate: Date
    ): boolean {
        if (apiKey.startAt && apiKey.endAt) {
            return currentDate > apiKey.endAt;
        }

        return false;
    }

    isNotYetActive(
        apiKey: {
            startAt?: Date | null;
            endAt?: Date | null;
        },
        currentDate: Date
    ): boolean {
        if (apiKey.startAt && apiKey.endAt) {
            return currentDate < apiKey.startAt;
        }

        return false;
    }

    isActive(apiKey: { isActive: boolean }): boolean {
        return apiKey.isActive;
    }

    /**
     * True when the key is active, not expired, and already within its start date.
     */
    isValid(
        apiKey: {
            startAt?: Date | null;
            endAt?: Date | null;
            isActive: boolean;
        },
        currentDate: Date
    ): boolean {
        const isExpired = this.isExpired(apiKey, currentDate);
        const isNotYetActive = this.isNotYetActive(apiKey, currentDate);

        return apiKey && apiKey.isActive && !isExpired && !isNotYetActive;
    }

    validateType(
        apiKey: { type: EnumApiKeyType },
        allowed: EnumApiKeyType[]
    ): boolean {
        return apiKey && allowed.includes(apiKey.type);
    }

    mapActivityLogMetadata(
        apiKey: Pick<ApiKey, 'id' | 'name' | 'type'>,
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
