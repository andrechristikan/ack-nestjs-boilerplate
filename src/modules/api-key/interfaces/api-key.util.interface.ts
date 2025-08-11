import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';

export interface IApiKeyUtil {
    createKey(key?: string): string;
    createHash(key: string, secret: string): string;
    createSecret(): string;
    validateCredential(
        key: string,
        secret: string,
        apiKey: ApiKeyEntity
    ): boolean;
    isExpired(apiKey: ApiKeyEntity, currentDate: Date): boolean;
    isNotYetActive(apiKey: ApiKeyEntity, currentDate: Date): boolean;
    isValid(apiKey: ApiKeyEntity, currentDate: Date): boolean;
    extractKeyFromRequest(request: IRequestApp): string | undefined;
    validateType(apiKey: ApiKeyEntity, allowed: ENUM_API_KEY_TYPE[]): boolean;
}
