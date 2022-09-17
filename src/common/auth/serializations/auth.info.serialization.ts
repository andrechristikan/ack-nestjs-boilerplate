import { PartialType } from '@nestjs/swagger';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

export class AuthInfoSerialization extends PartialType(
    UserPayloadSerialization
) {}
