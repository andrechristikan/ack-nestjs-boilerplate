import { HelperService } from '@common/helper/services/helper.service';
import { IVerificationCreate } from '@modules/verification/interfaces/verification.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_VERIFICATION_TYPE } from '@prisma/client';
import { Duration } from 'luxon';

@Injectable()
export class VerificationUtil {
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
            'verification.reference.prefix'
        );
        this.referenceLength = this.configService.get(
            'verification.reference.length'
        );
        this.otpLength = this.configService.get('verification.otpLength');
        this.expiredInMinutes = this.configService.get(
            'verification.expiredInMinutes'
        );
        this.tokenLength = this.configService.get('verification.tokenLength');
        this.resendInMinutes = this.configService.get(
            'verification.resendInMinutes'
        );

        this.homeUrl = this.configService.get('app.homeUrl');
        this.linkBaseUrl = this.configService.get('verification.linkBaseUrl');
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

    createVerification(type: ENUM_VERIFICATION_TYPE): IVerificationCreate {
        const token =
            type === ENUM_VERIFICATION_TYPE.MOBILE_NUMBER
                ? this.createOtp()
                : this.createToken();
        const link =
            type === ENUM_VERIFICATION_TYPE.MOBILE_NUMBER
                ? null
                : `${this.homeUrl}/${this.linkBaseUrl}/${token}`;

        return {
            reference: this.createReference(),
            expiredAt: this.setExpiredDate(),
            type,
            token,
            expiredInMinutes: this.expiredInMinutes,
            link,
            resendInMinutes: this.resendInMinutes,
        };
    }
}
