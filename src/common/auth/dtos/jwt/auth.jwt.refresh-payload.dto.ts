import { OmitType } from '@nestjs/swagger';
import { AuthJwtAccessPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';

export class AuthJwtRefreshPayloadDto extends OmitType(
    AuthJwtAccessPayloadDto,
    ['role', 'permissions', 'type'] as const
) {}
