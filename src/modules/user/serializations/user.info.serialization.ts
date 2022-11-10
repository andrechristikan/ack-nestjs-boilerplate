import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { IUserRolePayload } from 'src/modules/user/interfaces/user.interface';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

export class UserInfoSerialization extends OmitType(UserPayloadSerialization, [
    'role',
] as const) {
    @ApiProperty({
        example: {
            name: faker.name.jobTitle(),
            permissions: Object.values(ENUM_AUTH_PERMISSIONS),
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        },
        type: 'object',
    })
    readonly role: IUserRolePayload;
}
