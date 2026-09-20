import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey, Prisma } from '@generated/prisma-client/client';
import type { ApiKeyAdminListSelect } from '@modules/api-key/constants/api-key.constant';

export type IApiKeyList = Prisma.ApiKeyGetPayload<{
    select: typeof ApiKeyAdminListSelect;
}>;

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

export interface IApiKeyAnalyticCreated {
    id: string;
    type: EnumApiKeyType;
    createdAt: Date;
    createdBy: string | null;
}
