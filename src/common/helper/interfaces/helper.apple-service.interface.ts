import {
    IHelperApplePayload,
    IHelperAppleRefresh,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperAppleService {
    getTokenInfo(accessToken: string): Promise<IHelperApplePayload>;
    refreshToken(refreshToken: string): Promise<IHelperAppleRefresh>;
}
