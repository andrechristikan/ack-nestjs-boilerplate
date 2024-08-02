import { OmitType } from '@nestjs/swagger';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';

export class AuthJwtRefreshPayloadDto extends OmitType(
    AuthJwtAccessPayloadDto,
    ['role', 'permissions', 'type', 'email'] as const
) {}
