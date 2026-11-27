import { Injectable } from '@nestjs/common';
import { EnumHelperPemLabel } from '@common/helper/enums/helper.enum';
import { ConfigService } from '@nestjs/config';
import type { Algorithm } from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { AuthBearerScheme } from '@modules/auth/constants/auth.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthLoginIdentifiers,
    IAuthToken,
    IAuthTokenSignInput,
} from '@modules/auth/interfaces/auth.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { AuthJwtConfigInvalidException } from '@modules/auth/exceptions/auth.jwt-config-invalid.exception';
import { AuthJwtConfigMissingException } from '@modules/auth/exceptions/auth.jwt-config-missing.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class AuthJwtService {
    private readonly accessTokenKid: string;
    private readonly accessTokenPrivateKey: string;
    private readonly accessTokenExpiresInSeconds: number;
    private readonly accessTokenAlgorithm: Algorithm;

    private readonly refreshTokenKid: string;
    private readonly refreshTokenPrivateKey: string;
    readonly refreshTokenExpiresInSeconds: number;
    private readonly refreshTokenAlgorithm: Algorithm;

    private readonly audience: string;
    private readonly issuer: string;
    private readonly jtiLength: number;

    constructor(
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {
        this.accessTokenKid = this.configService.get<string>(
            'auth.jwt.accessToken.kid'
        )!;
        this.accessTokenExpiresInSeconds = this.configService.get<number>(
            'auth.jwt.accessToken.expiresInSeconds'
        )!;
        this.refreshTokenKid = this.configService.get<string>(
            'auth.jwt.refreshToken.kid'
        )!;
        this.refreshTokenExpiresInSeconds = this.configService.get<number>(
            'auth.jwt.refreshToken.expiresInSeconds'
        )!;

        this.accessTokenPrivateKey = this.parseRequiredBase64Der(
            'auth.jwt.accessToken.privateKey',
            EnumHelperPemLabel.privateKey,
            'PKCS#8 DER private key'
        );
        this.accessTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.accessToken.algorithm'
        )!;

        this.refreshTokenPrivateKey = this.parseRequiredBase64Der(
            'auth.jwt.refreshToken.privateKey',
            EnumHelperPemLabel.privateKey,
            'PKCS#8 DER private key'
        );
        this.refreshTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.refreshToken.algorithm'
        )!;

        this.audience = this.configService.get<string>('auth.jwt.audience')!;
        this.issuer = this.configService.get<string>('auth.jwt.issuer')!;
        this.jtiLength = this.configService.get<number>('auth.jwt.jtiLength')!;
    }

    private generateJti(): string {
        return this.helperStringService.random(this.jtiLength);
    }

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
            throw new AuthJwtConfigInvalidException(error, configKey, expected);
        }
    }

    private createPayloadAccessToken(
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

    private createPayloadRefreshToken({
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

    private toToken(
        user: IUser,
        accessToken: string,
        refreshToken: string,
        expiresIn: number
    ): IAuthToken {
        return {
            tokenType: AuthBearerScheme,
            roleType: user.role.type,
            expiresIn,
            accessToken,
            refreshToken,
        };
    }

    private remainingSeconds(exp: number): number {
        const today = this.helperDateService.now();
        const expiredAt = this.helperDateService.createFromTimestamp(
            exp * 1000
        );
        const remaining = this.helperDateService.diff(expiredAt, today);

        return Math.floor(remaining.milliseconds / 1000);
    }

    private getRefreshExp({ exp }: IAuthJwtRefreshTokenPayload): number {
        if (exp === undefined) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        return exp;
    }

    createLoginIdentifiers(): IAuthLoginIdentifiers {
        const sessionId = this.databaseUtil.createId();
        const jti = this.generateJti();

        return { sessionId, jti };
    }

    createAccessToken(
        subject: string,
        jti: string,
        payload: IAuthJwtAccessTokenPayload
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.accessTokenPrivateKey,
            expiresIn: this.accessTokenExpiresInSeconds,
            audience: this.audience,
            issuer: this.issuer,
            subject,
            algorithm: this.accessTokenAlgorithm,
            keyid: this.accessTokenKid,
            jwtid: jti,
        } as JwtSignOptions);
    }

    /** `expiresIn` is in seconds and replaces the configured refresh lifetime; `null` takes the configured lifetime. */
    createRefreshToken(
        subject: string,
        jti: string,
        payload: IAuthJwtRefreshTokenPayload,
        expiresIn: number | null
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.refreshTokenPrivateKey,
            expiresIn: expiresIn ?? this.refreshTokenExpiresInSeconds,
            audience: this.audience,
            issuer: this.issuer,
            subject,
            algorithm: this.refreshTokenAlgorithm,
            keyid: this.refreshTokenKid,
            jwtid: jti,
        } as JwtSignOptions);
    }

    /** Decodes a JWT payload without verifying its signature; call it only on an already verified token. */
    payloadToken<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    getRefreshJti({ jti }: IAuthJwtRefreshTokenPayload): string {
        if (!jti) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        return jti;
    }

    createTokens(
        user: IUser,
        { sessionId, jti, deviceOwnershipId, loginAt }: IAuthTokenSignInput,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): IAuthToken {
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
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
            this.createPayloadRefreshToken(payloadAccessToken);
        const refreshToken: string = this.createRefreshToken(
            user.id,
            jti,
            payloadRefreshToken,
            null
        );

        return this.toToken(
            user,
            accessToken,
            refreshToken,
            this.accessTokenExpiresInSeconds
        );
    }

    /** Decodes the given refresh token without verifying it, then signs another pair under a fresh jti in the same session; the issued refresh token expires when the old one would, and a token carrying no `exp` throws `AuthJwtRefreshTokenInvalidException` before anything is signed. */
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthAccessTokenGenerate {
        const payload = this.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshTokenFromRequest
        );
        const oldExp = this.getRefreshExp(payload);
        const { deviceOwnershipId, sessionId, loginAt, loginFrom, loginWith } =
            payload;

        const jti = this.generateJti();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
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
            this.createPayloadRefreshToken(payloadAccessToken);

        const newRefreshTokenExpireInSeconds = this.remainingSeconds(oldExp);

        const newRefreshToken: string = this.createRefreshToken(
            user.id,
            jti,
            newPayloadRefreshToken,
            newRefreshTokenExpireInSeconds
        );

        const tokens = this.toToken(
            user,
            accessToken,
            newRefreshToken,
            this.accessTokenExpiresInSeconds
        );

        return {
            tokens,
            jti,
            sessionId,
        };
    }
}
