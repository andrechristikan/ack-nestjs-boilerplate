import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Algorithm } from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { createPrivateKey, createPublicKey } from 'node:crypto';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthLoginIdentifiers,
    IAuthRefreshTokenGenerate,
    IAuthToken,
    IAuthTokenSignInput,
} from '@modules/auth/interfaces/auth.interface';
import { AuthBearerScheme } from '@modules/auth/constants/auth.constant';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthJwtConfigInvalidException } from '@modules/auth/exceptions/auth.jwt-config-invalid.exception';
import { AuthJwtConfigMissingException } from '@modules/auth/exceptions/auth.jwt-config-missing.exception';

/** Signs, verifies and rotates the access/refresh token pair. See docs/authentication.md. */
@Injectable()
export class AuthJwtDomain {
    private readonly jwtAccessTokenKid: string;
    private readonly jwtAccessTokenPrivateKey: string;
    private readonly jwtAccessTokenPublicKey: string;
    private readonly jwtAccessTokenExpirationTimeInSeconds: number;
    private readonly jwtAccessTokenAlgorithm: Algorithm;

    private readonly jwtRefreshTokenKid: string;
    private readonly jwtRefreshTokenPrivateKey: string;
    private readonly jwtRefreshTokenPublicKey: string;
    readonly jwtRefreshTokenExpirationTimeInSeconds: number;
    private readonly jwtRefreshTokenAlgorithm: Algorithm;

    private readonly jwtAudience: string;
    private readonly jwtIssuer: string;

    constructor(
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly authUtil: AuthUtil
    ) {
        this.jwtAccessTokenKid = this.configService.get<string>(
            'auth.jwt.accessToken.kid'
        )!;
        this.jwtAccessTokenExpirationTimeInSeconds =
            this.configService.get<number>(
                'auth.jwt.accessToken.expirationTimeInSeconds'
            )!;
        this.jwtRefreshTokenKid = this.configService.get<string>(
            'auth.jwt.refreshToken.kid'
        )!;
        this.jwtRefreshTokenExpirationTimeInSeconds =
            this.configService.get<number>(
                'auth.jwt.refreshToken.expirationTimeInSeconds'
            )!;

        this.jwtAccessTokenPrivateKey = this.parseRequiredBase64DerPrivateKey(
            'auth.jwt.accessToken.privateKey'
        );
        this.jwtAccessTokenPublicKey = this.parseRequiredBase64DerPublicKey(
            'auth.jwt.accessToken.publicKey'
        );
        this.jwtAccessTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.accessToken.algorithm'
        )!;

        this.jwtRefreshTokenPrivateKey = this.parseRequiredBase64DerPrivateKey(
            'auth.jwt.refreshToken.privateKey'
        );
        this.jwtRefreshTokenPublicKey = this.parseRequiredBase64DerPublicKey(
            'auth.jwt.refreshToken.publicKey'
        );
        this.jwtRefreshTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.refreshToken.algorithm'
        )!;

        this.jwtAudience = this.configService.get<string>('auth.jwt.audience')!;
        this.jwtIssuer = this.configService.get<string>('auth.jwt.issuer')!;
    }

    private parseRequiredBase64DerPrivateKey(configKey: string): string {
        const value = this.configService.get<string>(configKey);
        const raw = value?.trim();

        if (!raw) {
            throw new AuthJwtConfigMissingException(configKey);
        }

        try {
            return createPrivateKey({
                key: Buffer.from(raw, 'base64'),
                format: 'der',
                type: 'pkcs8',
            }).export({
                type: 'pkcs8',
                format: 'pem',
            }) as string;
        } catch (error) {
            throw new AuthJwtConfigInvalidException(
                configKey,
                'PKCS#8 DER private key',
                error
            );
        }
    }

    private parseRequiredBase64DerPublicKey(configKey: string): string {
        const value = this.configService.get<string>(configKey);
        const raw = value?.trim();

        if (!raw) {
            throw new AuthJwtConfigMissingException(configKey);
        }

        try {
            return createPublicKey({
                key: Buffer.from(raw, 'base64'),
                format: 'der',
                type: 'spki',
            }).export({
                type: 'spki',
                format: 'pem',
            }) as string;
        } catch (error) {
            throw new AuthJwtConfigInvalidException(
                configKey,
                'SPKI DER public key',
                error
            );
        }
    }

    createAccessToken(
        subject: string,
        jti: string,
        payload: IAuthJwtAccessTokenPayload
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.jwtAccessTokenPrivateKey,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject,
            algorithm: this.jwtAccessTokenAlgorithm,
            keyid: this.jwtAccessTokenKid,
            jwtid: jti,
        } as JwtSignOptions);
    }

    /** Signs a refresh token with the refresh private key; expiresIn (seconds) overrides the configured default. */
    createRefreshToken(
        subject: string,
        jti: string,
        payload: IAuthJwtRefreshTokenPayload,
        expiresIn?: number
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.jwtRefreshTokenPrivateKey,
            expiresIn: expiresIn ?? this.jwtRefreshTokenExpirationTimeInSeconds,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject,
            algorithm: this.jwtRefreshTokenAlgorithm,
            keyid: this.jwtRefreshTokenKid,
            jwtid: jti,
        } as JwtSignOptions);
    }

    validateAccessToken(subject: string, jti: string, token: string): boolean {
        try {
            this.jwtService.verify(token, {
                publicKey: this.jwtAccessTokenPublicKey,
                algorithms: [this.jwtAccessTokenAlgorithm],
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject,
                jwtid: jti,
            });

            return true;
        } catch {
            return false;
        }
    }

    validateRefreshToken(subject: string, jti: string, token: string): boolean {
        try {
            this.jwtService.verify(token, {
                publicKey: this.jwtRefreshTokenPublicKey,
                algorithms: [this.jwtRefreshTokenAlgorithm],
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject,
                jwtid: jti,
            });

            return true;
        } catch {
            return false;
        }
    }

    /** Decodes a JWT payload WITHOUT signature verification; use only on already-verified tokens. */
    payloadToken<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    /** Mints a new session id and a new jti. */
    createLoginIdentifiers(): IAuthLoginIdentifiers {
        const sessionId = this.databaseUtil.createId();
        const jti = this.authUtil.generateJti();

        return { sessionId, jti };
    }

    /** Signs the access and refresh token pair for the user. */
    createTokens(
        user: IUser,
        { sessionId, jti, deviceOwnershipId, loginAt }: IAuthTokenSignInput,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): IAuthToken {
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.authUtil.createPayloadAccessToken(
                user,
                sessionId,
                deviceOwnershipId,
                loginAt,
                loginFrom,
                loginWith
            );
        const accessToken: string = this.createAccessToken(
            user.id,
            jti,
            payloadAccessToken
        );

        const payloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.authUtil.createPayloadRefreshToken(payloadAccessToken);
        const refreshToken: string = this.createRefreshToken(
            user.id,
            jti,
            payloadRefreshToken
        );

        return {
            tokenType: AuthBearerScheme,
            roleType: user.role.type,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken,
        };
    }

    /** Rotates the token pair with a new jti, reusing the session and capping the refresh expiry at the old token's remaining lifetime. */
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthRefreshTokenGenerate {
        const {
            deviceOwnershipId,
            sessionId,
            loginAt,
            loginFrom,
            loginWith,
            exp: oldExp,
        } = this.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshTokenFromRequest
        );

        const jti = this.authUtil.generateJti();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.authUtil.createPayloadAccessToken(
                user,
                sessionId,
                deviceOwnershipId,
                loginAt,
                loginFrom,
                loginWith
            );
        const accessToken: string = this.createAccessToken(
            user.id,
            jti,
            payloadAccessToken
        );

        const newPayloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.authUtil.createPayloadRefreshToken(payloadAccessToken);

        const today = this.helperDateService.create();
        const expiredAt = this.helperDateService.createFromTimestamp(
            (oldExp ?? 0) * 1000
        );

        const newRefreshTokenExpire = this.helperDateService.diff(
            expiredAt,
            today
        );
        const newRefreshTokenExpireInSeconds = newRefreshTokenExpire.seconds
            ? newRefreshTokenExpire.seconds
            : Math.floor(newRefreshTokenExpire.milliseconds / 1000);

        const newRefreshToken: string = this.createRefreshToken(
            user.id,
            jti,
            newPayloadRefreshToken,
            newRefreshTokenExpireInSeconds
        );

        const tokens: IAuthToken = {
            tokenType: AuthBearerScheme,
            roleType: user.role.type,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken: newRefreshToken,
        };

        return {
            tokens,
            jti,
            sessionId,
            expiredInMs: newRefreshTokenExpire.milliseconds,
        };
    }
}
