import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';
import { IApiKeyUtil } from '@modules/api-key/interfaces/api-key.util.interface';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyUtil implements IApiKeyUtil {
    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly header: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.header = this.configService.get<string>('auth.xApiKey.header');
    }

    createKey(key?: string): string {
        const random: string = this.helperService.randomString(25);
        return `${this.env}_${key ?? random}`;
    }

    createHash(key: string, secret: string): string {
        return this.helperService.sha256Hash(`${key}:${secret}`);
    }

    createSecret(): string {
        return this.helperService.randomString(50);
    }

    validateCredential(
        key: string,
        secret: string,
        apiKey: ApiKeyEntity
    ): boolean {
        if (!apiKey) {
            return false;
        }

        const expectedHash = this.createHash(key, secret);
        return this.helperService.sha256Compare(expectedHash, apiKey.hash);
    }

    isExpired(apiKey: ApiKeyEntity, currentDate: Date): boolean {
        if (apiKey.endDate && apiKey.endDate) {
            return currentDate > apiKey.endDate;
        }

        return false;
    }

    isNotYetActive(apiKey: ApiKeyEntity, currentDate: Date): boolean {
        if (apiKey.startDate && apiKey.endDate) {
            return currentDate < apiKey.startDate;
        }

        return false;
    }

    isActive(apiKey: ApiKeyEntity): boolean {
        return apiKey.isActive;
    }

    isValid(apiKey: ApiKeyEntity, currentDate: Date): boolean {
        return (
            apiKey &&
            apiKey.isActive &&
            !this.isExpired(apiKey, currentDate) &&
            !this.isNotYetActive(apiKey, currentDate)
        );
    }

    extractKeyFromRequest(request: IRequestApp): string | undefined {
        const xApiKey: string = request.headers[
            `${this.header.toLowerCase()}`
        ] as string;

        return xApiKey;
    }

    validateType(apiKey: ApiKeyEntity, allowed: ENUM_API_KEY_TYPE[]): boolean {
        return !apiKey || !allowed.includes(apiKey.type);
    }
}
