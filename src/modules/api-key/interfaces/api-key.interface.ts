import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey, Prisma } from '@generated/prisma-client/client';
import type { ApiKeySelect } from '@modules/api-key/constants/api-key.constant';

export type IApiKey = Prisma.ApiKeyGetPayload<{
    select: typeof ApiKeySelect;
}>;

export interface IApiKeyHeader {
    key: string;
    secret: string;
}

export interface IApiKeyGenerateCredential {
    key: string;
    secret: string;
    hash: string;
}

export interface IApiKeyCreate {
    name: string;
    type: EnumApiKeyType;
    startAt: Date | null;
    endAt: Date | null;
}

export interface IApiKeyWithSecret {
    apiKey: IApiKey;
    secret: string;
}

export interface IApiKeyCreated extends IApiKey {
    secret: string;
}

export type IApiKeyActivityLogSubject = Pick<ApiKey, 'id' | 'name' | 'type'>;
