import { IntersectionType, PickType } from '@nestjs/swagger';
import { EmailMobileNumberVerifiedDto } from '@modules/email/dtos/email.mobile-number-verified.dto';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';

export class SmsSendRequestDto extends IntersectionType(
    PickType(EmailSendDto, ['name'] as const),
    PickType(EmailMobileNumberVerifiedDto, ['mobileNumber'] as const)
) {}
