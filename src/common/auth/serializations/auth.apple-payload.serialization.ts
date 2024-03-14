import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AuthApplePayloadDataSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
    })
    email: string;
}

export class AuthApplePayloadSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
        type: AuthApplePayloadDataSerialization,
    })
    @Type(() => AuthApplePayloadDataSerialization)
    user: AuthApplePayloadDataSerialization;
}
