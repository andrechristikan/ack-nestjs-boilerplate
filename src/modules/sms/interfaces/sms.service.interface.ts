import { SmsSendRequestDto } from 'src/modules/sms/dtos/request/sms.send.request.dto';
import { SmsVerificationRequestDto } from 'src/modules/sms/dtos/request/sms.verification.request.dto';

export interface ISmsService {
    sendVerification(
        { name, mobileNumber }: SmsSendRequestDto,
        { expiredAt, otp }: SmsVerificationRequestDto
    ): Promise<void>;
}
