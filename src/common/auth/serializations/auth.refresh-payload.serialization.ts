import { ApiProperty, OmitType } from '@nestjs/swagger';
import { AuthAccessPayloadSerialization } from 'src/common/auth/serializations/auth.access-payload.serialization';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

export class AuthRefreshPayloadSerialization extends OmitType(
    AuthAccessPayloadSerialization,
    ['user'] as const
) {
    @ApiProperty({
        required: true,
        nullable: false,
        type: ResponseIdSerialization,
    })
    user: ResponseIdSerialization;
}
