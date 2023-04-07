import { PickType } from '@nestjs/swagger';
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

export class UserInfoSerialization extends PickType(UserPayloadSerialization, [
    '_id',
    'username',
    'loginDate',
] as const) {
    readonly role: string;
    readonly type: ENUM_ROLE_TYPE;
}
