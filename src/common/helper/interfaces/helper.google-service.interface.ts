import {
    IHelperGooglePayload,
    IHelperGoogleRefresh,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperGoogleService {
    getTokenInfo(accessToken: string): Promise<IHelperGooglePayload>;
    refreshToken(refreshToken: string): Promise<IHelperGoogleRefresh>;
}
