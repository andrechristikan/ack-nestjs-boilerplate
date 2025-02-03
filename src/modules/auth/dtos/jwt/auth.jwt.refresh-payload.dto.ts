import { OmitType } from '@nestjs/swagger';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';

export class AuthJwtRefreshPayloadDto extends OmitType(
    AuthJwtAccessPayloadDto,
    ['role', 'type', 'email'] as const
) {}
