import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import type {
    IApiKeyGenerateCredential,
    IApiKeyHeader,
} from '@modules/api-key/interfaces/api-key.interface';

/** Mints and verifies the API key credential pair. */
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

    /**
     * Builds a public key prefixed with the current environment for traceability.
     */
    createKey(key: string | null): string {
        if (key !== null && key !== '') {
            return `${this.env}_${key}`;
        }

        const random: string = this.helperStringService.random(25);
        return `${this.env}_${random}`;
    }

    /**
     * Derives the SHA-256 hash stored for credential verification.
     */
    createHash(key: string, secret: string): string {
        return this.helperHashService.sha256Hash(`${key}:${secret}`);
    }

    createSecret(): string {
        return this.helperStringService.random(50);
    }

    /**
     * Generates a fresh key/secret pair plus the hash to persist.
     */
    generateCredential(): IApiKeyGenerateCredential {
        const key = this.createKey(null);
        const secret = this.createSecret();
        const hash: string = this.createHash(key, secret);

        return { key, secret, hash };
    }

    /**
     * Splits a `key:secret` header into its two halves; null when it is not exactly two non-blank parts.
     */
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

    /**
     * Verifies the supplied key/secret by re-deriving the hash and comparing it to the stored one.
     */
    validateCredential(
        key: string,
        secret: string,
        apiKey: { hash: string }
    ): boolean {
        const expectedHash = this.createHash(key, secret);
        return this.helperHashService.sha256Compare(expectedHash, apiKey.hash);
    }
}
