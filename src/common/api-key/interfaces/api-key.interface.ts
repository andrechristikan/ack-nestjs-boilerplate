import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';

export interface IApiKeyPayload {
    _id: string;
    key: string;
    name: string;
}

export interface IApiKeyEntity extends ApiKeyEntity {
    secret: string;
}
