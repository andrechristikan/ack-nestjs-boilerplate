import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

export interface IApiKeyPayload {
    _id: string;
    key: string;
    type: ENUM_API_KEY_TYPE;
}
