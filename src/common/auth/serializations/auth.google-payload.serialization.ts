import { ApiProperty } from '@nestjs/swagger';

export class AuthGooglePayloadSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
    })
    email: string;
}
