import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { AwsPinpointService } from 'src/modules/aws/services/aws.pinpoint.service';
import { SmsSendRequestDto } from 'src/modules/sms/dtos/request/sms.send.request.dto';
import { SmsVerificationRequestDto } from 'src/modules/sms/dtos/request/sms.verification.request.dto';
import { ISmsService } from 'src/modules/sms/interfaces/sms.service.interface';

@Injectable()
export class SmsService implements ISmsService {
    private messageVerification: string;

    private readonly homeName: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly awsPinPointService: AwsPinpointService
    ) {
        this.messageVerification = readFileSync(
            `${__dirname}/../templates/verification.template.txt`,
            'utf8'
        );

        this.homeName = this.configService.get<string>('home.name')!;
    }

    async sendVerification(
        { name, mobileNumber }: SmsSendRequestDto,
        { expiredAt, otp }: SmsVerificationRequestDto
    ): Promise<void> {
        const message = this.messageVerification
            .replace('{name}', name)
            .replace('{otp}', otp)
            .replace(
                '{expiredAt}',
                this.helperDateService.formatToRFC2822(expiredAt)
            )
            .replace('{homeName}', this.homeName);

        return this.awsPinPointService.sendSMS(mobileNumber, message);
    }
}
