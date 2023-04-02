import { PickType } from '@nestjs/swagger';
import { ENUM_AUTH_TYPE } from 'src/common/auth/constants/auth.enum.constant';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

export class UserInfoSerialization extends PickType(UserPayloadSerialization, [
    '_id',
    'username',
    'loginDate',
] as const) {
    readonly role: string;
    readonly type: ENUM_AUTH_TYPE;
}
