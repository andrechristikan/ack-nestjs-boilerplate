import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import type { ApiKeySelect } from '@modules/api-key/constants/api-key.constant';

export type IApiKey = Prisma.ApiKeyGetPayload<{
    select: typeof ApiKeySelect;
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
    apiKey: IApiKey;
    secret: string;
}

export interface IApiKeyCreated extends IApiKey {
    secret: string;
}

export interface IApiKeyAnalyticCreated {
    id: string;
    type: EnumApiKeyType;
    createdAt: Date;
    createdBy: string | null;
}
