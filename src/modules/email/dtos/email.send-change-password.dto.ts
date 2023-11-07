import { PickType } from '@nestjs/swagger';
import { EmailSendSignUpDto } from 'src/modules/email/dtos/email.send-sign-up.dto';

export class EmailSendChangePasswordDto extends PickType(EmailSendSignUpDto, [
    'name',
] as const) {}
