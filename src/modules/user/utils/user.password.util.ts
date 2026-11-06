import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IUserForgotPasswordCreate } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import ms from 'ms';

@Injectable()
export class UserPasswordUtil {
    private readonly homeUrl: string;
    private readonly forgotPasswordReferencePrefix: string;
    private readonly forgotPasswordReferenceLength: number;
    private readonly forgotExpiredInMinutes: number;
    private readonly forgotTokenLength: number;
    readonly forgotResendInMinutes: number;
    private readonly forgotLinkPattern: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.forgotPasswordReferencePrefix = this.configService.get<string>(
            'forgotPassword.reference.prefix'
        )!;
        this.forgotPasswordReferenceLength = this.configService.get<number>(
            'forgotPassword.reference.length'
        )!;
        const forgotExpiredInMs = this.configService.get<number>(
            'forgotPassword.expiredInMs'
        )!;
        this.forgotExpiredInMinutes = forgotExpiredInMs / ms('1m');
        this.forgotTokenLength = this.configService.get<number>(
            'forgotPassword.tokenLength'
        )!;
        const forgotResendInMs = this.configService.get<number>(
            'forgotPassword.resendInMs'
        )!;
        this.forgotResendInMinutes = forgotResendInMs / ms('1m');
        this.forgotLinkPattern = this.configService.get<string>(
            'forgotPassword.linkPattern'
        )!;
    }

    createReference(): string {
        const random = this.helperStringService.random(
            this.forgotPasswordReferenceLength
        );

        return `${this.forgotPasswordReferencePrefix}-${random}`;
    }

    createToken(): string {
        return this.helperStringService.random(this.forgotTokenLength);
    }

    createExpiredAt(): Date {
        const now = this.helperDateService.create();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.forgotExpiredInMinutes })
        );
    }

    createForgot(): IUserForgotPasswordCreate {
        const token = this.createToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.helperStringService.fillPattern(
            this.forgotLinkPattern,
            { homeUrl: this.homeUrl, token }
        );
        const reference = this.createReference();
        const expiredAt = this.createExpiredAt();

        return {
            reference,
            expiredAt,
            token,
            hashedToken,
            expiredInMinutes: this.forgotExpiredInMinutes,
            resendInMinutes: this.forgotResendInMinutes,
            link,
        };
    }
}
