import { PickType } from '@nestjs/swagger';
import { EmailVerificationDto } from 'src/modules/email/dtos/email.verification.dto';

export class EmailVerifiedDto extends PickType(EmailVerificationDto, [
    'reference',
] as const) {}
