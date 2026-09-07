import { IApiKeyGenerateCredential } from '@modules/api-key/interfaces/api-key.interface';

export interface IApiKeyCredentialService {
    createKey(key?: string): string;
    createHash(key: string, secret: string): string;
    createSecret(): string;
    generateCredential(key?: string): IApiKeyGenerateCredential;
    validateCredential(
        key: string,
        secret: string,
        apiKey: { hash: string }
    ): boolean;
}
