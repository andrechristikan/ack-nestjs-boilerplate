import { PickType } from '@nestjs/swagger';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

export class UserInfoSerialization extends PickType(UserPayloadSerialization, [
    '_id',
    'username',
    'rememberMe',
    'loginDate',
] as const) {
    readonly role: string;
    readonly accessFor: ENUM_AUTH_ACCESS_FOR;
}
