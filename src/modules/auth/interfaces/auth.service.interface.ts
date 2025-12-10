import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthSocialPayload,
    IAuthTokenGenerate,
} from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { EnumUserLoginFrom, EnumUserSignUpWith } from '@prisma/client';

export interface IAuthService {
    createTokens(
        user: IUser,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserSignUpWith
    ): IAuthTokenGenerate;
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthTokenGenerate;
    validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): Promise<IAuthJwtAccessTokenPayload>;
    validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): Promise<IAuthJwtRefreshTokenPayload>;
    validateOAuthAppleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean>;
    validateOAuthGoogleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean>;
}
