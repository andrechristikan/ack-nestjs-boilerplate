import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';

export interface IApiKeyPayload {
    _id: string;
    key: string;
    type: ENUM_API_KEY_TYPE;
}
