import { Injectable } from '@nestjs/common';
import { EnumHelperPemLabel } from '@common/helper/enums/helper.enum';
import { ConfigService } from '@nestjs/config';
import type { Algorithm } from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
    IAuthTokenSignInput,
} from '@modules/auth/interfaces/auth.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { AuthJwtConfigInvalidException } from '@modules/auth/exceptions/auth.jwt-config-invalid.exception';
import { AuthJwtConfigMissingException } from '@modules/auth/exceptions/auth.jwt-config-missing.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';

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
        private readonly helperEncryptionService: HelperEncryptionService,
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

        this.jwtAccessTokenPrivateKey = this.parseRequiredBase64Der(
            'auth.jwt.accessToken.privateKey',
            EnumHelperPemLabel.privateKey,
            'PKCS#8 DER private key'
        );
        this.jwtAccessTokenPublicKey = this.parseRequiredBase64Der(
            'auth.jwt.accessToken.publicKey',
            EnumHelperPemLabel.publicKey,
            'SPKI DER public key'
        );
        this.jwtAccessTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.accessToken.algorithm'
        )!;

        this.jwtRefreshTokenPrivateKey = this.parseRequiredBase64Der(
            'auth.jwt.refreshToken.privateKey',
            EnumHelperPemLabel.privateKey,
            'PKCS#8 DER private key'
        );
        this.jwtRefreshTokenPublicKey = this.parseRequiredBase64Der(
            'auth.jwt.refreshToken.publicKey',
            EnumHelperPemLabel.publicKey,
            'SPKI DER public key'
        );
        this.jwtRefreshTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.refreshToken.algorithm'
        )!;

        this.jwtAudience = this.configService.get<string>('auth.jwt.audience')!;
        this.jwtIssuer = this.configService.get<string>('auth.jwt.issuer')!;
    }

    /** Reads a base64 DER key from config and frames it as PEM under the label; `expected` names the key kind in the invalid-config error. */
    private parseRequiredBase64Der(
        configKey: string,
        label: EnumHelperPemLabel,
        expected: string
    ): string {
        const value = this.configService.get<string>(configKey);
        const raw = value?.trim();

        if (!raw) {
            throw new AuthJwtConfigMissingException(configKey);
        }

        try {
            return this.helperEncryptionService.derBase64ToPem(raw, label);
        } catch (error) {
            throw new AuthJwtConfigInvalidException(configKey, expected, error);
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

    getRefreshJti({ jti }: IAuthJwtRefreshTokenPayload): string {
        if (!jti) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        return jti;
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

        return this.authUtil.toToken(
            user,
            accessToken,
            refreshToken,
            this.jwtAccessTokenExpirationTimeInSeconds
        );
    }

    /** Rotates the token pair with a new jti, reusing the session and capping the refresh expiry at the old token's remaining lifetime. */
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthAccessTokenGenerate {
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

        const newRefreshTokenExpireInSeconds = this.authUtil.remainingSeconds(
            oldExp ?? null
        );

        const newRefreshToken: string = this.createRefreshToken(
            user.id,
            jti,
            newPayloadRefreshToken,
            newRefreshTokenExpireInSeconds
        );

        const tokens = this.authUtil.toToken(
            user,
            accessToken,
            newRefreshToken,
            this.jwtAccessTokenExpirationTimeInSeconds
        );

        return {
            tokens,
            jti,
            sessionId,
        };
    }
}
