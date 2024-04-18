import { ApiProperty } from '@nestjs/swagger';

export class AuthSocialGooglePayloadDto {
    @ApiProperty({
        required: true,
        nullable: false,
    })
    email: string;
}
