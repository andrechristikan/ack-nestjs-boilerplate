import { Injectable } from '@nestjs/common';
import { ApiKey, EnumApiKeyType } from '@generated/prisma-client';
import { IApiKeyCreated } from '@modules/api-key/interfaces/api-key.interface';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

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
        return (
            apiKey &&
            apiKey.isActive &&
            !this.isExpired(apiKey, currentDate) &&
            !this.isNotYetActive(apiKey, currentDate)
        );
    }

    validateType(
        apiKey: { type: EnumApiKeyType },
        allowed: EnumApiKeyType[]
    ): boolean {
        return apiKey && allowed.includes(apiKey.type);
    }

    mapActivityLogMetadata(apiKey: ApiKey): IActivityLogMetadata {
        return {
            apiKeyId: apiKey.id,
            apiKeyName: apiKey.name,
            apiKeyType: apiKey.type,
            timestamp: apiKey.updatedAt ?? apiKey.createdAt,
        };
    }
}
