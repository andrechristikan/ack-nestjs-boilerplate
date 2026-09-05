import { ApiKey, EnumApiKeyType } from '@generated/prisma-client';

export interface IApiKeyGenerateCredential {
    key: string;
    secret: string;
    hash: string;
}

export interface IApiKeyCreate {
    name: string;
    type: EnumApiKeyType;
    startAt?: Date;
    endAt?: Date;
}

export interface IApiKeyWithSecret {
    apiKey: ApiKey;
    secret: string;
}

export interface IApiKeyCreated extends ApiKey {
    secret: string;
}
