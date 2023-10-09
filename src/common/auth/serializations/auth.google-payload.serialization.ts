import { ApiProperty } from '@nestjs/swagger';

export class AuthGooglePayloadSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
    })
    email: string;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    name: string;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    accessToken: string;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    refreshToken: string;
}
