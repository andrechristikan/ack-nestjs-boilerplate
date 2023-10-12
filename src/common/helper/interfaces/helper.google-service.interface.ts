import {
    IGooglePayload,
    IGoogleRefresh,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperGoogleService {
    getTokenInfo(accessToken: string): Promise<IGooglePayload>;
    refreshToken(refreshToken: string): Promise<IGoogleRefresh>;
}
