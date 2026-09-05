import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HashAlgorithm, OTPStrategy, generateURI } from 'otplib';

/** 2FA utility: the otpauth key URI consumed by authenticator apps. */
@Injectable()
export class AuthTwoFactorUtil {
    private readonly strategy: OTPStrategy;
    private readonly algorithm: HashAlgorithm;
    private readonly issuer: string;
    private readonly digits: number;
    private readonly periodInSeconds: number;

    constructor(private readonly configService: ConfigService) {
        this.strategy = this.configService.get<OTPStrategy>(
            'auth.twoFactor.strategy'
        )!;
        this.algorithm = this.configService.get<HashAlgorithm>(
            'auth.twoFactor.algorithm'
        )!;
        this.issuer = this.configService.get<string>('auth.twoFactor.issuer')!;
        this.digits = this.configService.get<number>('auth.twoFactor.digits')!;
        this.periodInSeconds = this.configService.get<number>(
            'auth.twoFactor.periodInSeconds'
        )!;
    }

    /** Builds the otpauth key URI consumed by authenticator apps (QR code). */
    createKeyUri(email: string, secret: string): string {
        return generateURI({
            issuer: this.issuer,
            label: `${this.issuer}:${email}`,
            secret,
            digits: this.digits,
            period: this.periodInSeconds,
            strategy: this.strategy,
            algorithm: this.algorithm,
        });
    }
}
