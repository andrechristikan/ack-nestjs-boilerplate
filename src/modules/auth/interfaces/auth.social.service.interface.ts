import { TokenPayload } from 'google-auth-library';
import { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';

export interface IAuthSocialService {
    verifyGoogle(token: string): Promise<TokenPayload>;
    verifyApple(token: string): Promise<VerifyAppleIdTokenResponse>;
}
