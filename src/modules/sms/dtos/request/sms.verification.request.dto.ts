import { PickType } from '@nestjs/swagger';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';

export class SmsVerificationRequestDto extends PickType(EmailVerificationDto, [
    'otp',
    'expiredAt',
] as const) {}
