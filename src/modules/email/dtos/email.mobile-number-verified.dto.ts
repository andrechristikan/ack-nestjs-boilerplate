import { ApiProperty } from '@nestjs/swagger';
import { EmailVerifiedDto } from 'src/modules/email/dtos/email.verified.dto';

export class EmailMobileNumberVerifiedDto extends EmailVerifiedDto {
    @ApiProperty({
        required: true,
        description: 'Mobile number',
    })
    mobileNumber: string;
}
