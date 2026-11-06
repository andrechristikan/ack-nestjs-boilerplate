import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import type {
    IApiKeyGenerateCredential,
    IApiKeyHeader,
} from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class ApiKeyCredentialUtil {
    private readonly env: EnumAppEnvironment;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService
    ) {
        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
    }

    /** Prefixes the key with the environment; a null or empty key draws a random one. */
    createKey(key: string | null): string {
        if (key !== null && key !== '') {
            return `${this.env}_${key}`;
        }

        const random: string = this.helperStringService.random(25);
        return `${this.env}_${random}`;
    }

    createHash(key: string, secret: string): string {
        return this.helperHashService.sha256Hash(`${key}:${secret}`);
    }

    createSecret(): string {
        return this.helperStringService.random(50);
    }

    generateCredential(): IApiKeyGenerateCredential {
        const key = this.createKey(null);
        const secret = this.createSecret();
        const hash: string = this.createHash(key, secret);

        return { key, secret, hash };
    }

    /** Splits a `key:secret` header; null unless it has exactly two non-blank parts. */
    parseHeader(header: string): IApiKeyHeader | null {
        const [key, secret, ...rest] = header.split(':');
        if (
            key === undefined ||
            secret === undefined ||
            rest.length > 0 ||
            key.trim() === '' ||
            secret.trim() === ''
        ) {
            return null;
        }

        return { key, secret };
    }

    validateCredential(
        key: string,
        secret: string,
        apiKey: { hash: string }
    ): boolean {
        const expectedHash = this.createHash(key, secret);
        return this.helperHashService.sha256Compare(expectedHash, apiKey.hash);
    }
}
