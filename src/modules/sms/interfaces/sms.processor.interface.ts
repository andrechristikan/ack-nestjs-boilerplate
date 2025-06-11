import { SmsSendRequestDto } from '@modules/sms/dtos/request/sms.send.request.dto';
import { SmsVerificationRequestDto } from '@modules/sms/dtos/request/sms.verification.request.dto';

export interface ISmsProcessor {
    processOtpVerificationSms(
        send: SmsSendRequestDto,
        data: SmsVerificationRequestDto
    ): Promise<void>;
}
