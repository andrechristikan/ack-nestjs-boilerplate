import { HelperService } from '@common/helper/services/helper.service';
import { IResetPasswordCreate } from '@modules/reset-password/interfaces/reset-password.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class ResetPasswordUtil {
    private readonly referencePrefix: string;
    private readonly referenceLength: number;
    private readonly otpLength: number;
    private readonly expiredInMinutes: number;
    private readonly tokenLength: number;
    private readonly resendInMinutes: number;

    private readonly homeUrl: string;
    private readonly linkBaseUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.referencePrefix = this.configService.get(
            'resetPassword.reference.prefix'
        );
        this.referenceLength = this.configService.get(
            'resetPassword.reference.length'
        );
        this.otpLength = this.configService.get('resetPassword.otpLength');
        this.expiredInMinutes = this.configService.get(
            'resetPassword.expiredInMinutes'
        );
        this.tokenLength = this.configService.get('resetPassword.tokenLength');
        this.resendInMinutes = this.configService.get(
            'resetPassword.resendInMinutes'
        );

        this.homeUrl = this.configService.get('app.homeUrl');
        this.linkBaseUrl = this.configService.get('resetPassword.linkBaseUrl');
    }

    createReference(): string {
        const random = this.helperService.randomString(this.referenceLength);

        return `${this.referencePrefix}-${random}`;
    }

    createOtp(): string {
        return this.helperService.randomDigits(this.otpLength);
    }

    createToken(): string {
        return this.helperService.randomString(this.tokenLength);
    }

    setExpiredDate(): Date {
        const now = new Date();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: this.expiredInMinutes })
        );
    }

    createForgotPassword(): IResetPasswordCreate {
        const token = this.createToken();

        return {
            reference: this.createReference(),
            expiredAt: this.setExpiredDate(),
            token,
            expiredInMinutes: this.expiredInMinutes,
            resendInMinutes: this.resendInMinutes,
            link: `${this.homeUrl}/${this.linkBaseUrl}/${token}`,
        };
    }
}
