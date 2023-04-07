import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';

export interface IApiKeyPayload {
    _id: string;
    key: string;
    name: string;
}

export interface IApiKeyCreated {
    secret: string;
    doc: ApiKeyDoc;
}
