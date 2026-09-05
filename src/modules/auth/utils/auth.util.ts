import { Injectable } from '@nestjs/common';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    User,
} from '@generated/prisma-client';

/** Auth utility: shapes the JWT payloads and the jti. See docs/authentication.md. */
@Injectable()
export class AuthUtil {
    constructor(private readonly helperStringService: HelperStringService) {}

    /** Assembles the access token payload from the user and login context. */
    createPayloadAccessToken(
        data: User,
        sessionId: string,
        deviceOwnershipId: string,
        loginAt: Date,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): IAuthJwtAccessTokenPayload {
        return {
            userId: data.id,
            roleId: data.roleId,
            username: data.username,
            email: data.email,
            sessionId,
            deviceOwnershipId,
            loginAt,
            loginFrom,
            loginWith,
        };
    }

    /** Derives the minimal refresh token payload from an access token payload. */
    createPayloadRefreshToken({
        sessionId,
        userId,
        deviceOwnershipId,
        loginFrom,
        loginAt,
        loginWith,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload {
        return {
            loginAt,
            loginFrom,
            loginWith,
            sessionId,
            deviceOwnershipId,
            userId,
        };
    }

    /** Generates a random 32-character jti used to bind a token to its session. */
    generateJti(): string {
        return this.helperStringService.random(32);
    }
}
