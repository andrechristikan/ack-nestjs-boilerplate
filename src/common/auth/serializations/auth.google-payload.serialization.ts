import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AuthGooglePayloadDataSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
    })
    email: string;
}

export class AuthGooglePayloadSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
        type: AuthGooglePayloadDataSerialization,
    })
    @Type(() => AuthGooglePayloadDataSerialization)
    user: AuthGooglePayloadDataSerialization;
}
