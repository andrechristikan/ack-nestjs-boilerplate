import { SmsSendRequestDto } from '@module/sms/dtos/request/sms.send.request.dto';
import { SmsVerificationRequestDto } from '@module/sms/dtos/request/sms.verification.request.dto';

export interface ISmsProcessor {
    processOtpVerificationSms(
        send: SmsSendRequestDto,
        data: SmsVerificationRequestDto
    ): Promise<void>;
}
