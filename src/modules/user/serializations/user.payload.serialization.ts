import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Transform } from 'class-transformer';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { IUserRolePayload } from 'src/modules/user/interfaces/user.interface';
import { UserGetSerialization } from './user.get.serialization';

export class UserPayloadSerialization extends OmitType(UserGetSerialization, [
    'photo',
    'role',
    'isActive',
    'passwordExpired',
] as const) {
    @Exclude()
    readonly photo?: AwsS3Serialization;

    @ApiProperty({
        example: {
            name: faker.name.jobTitle(),
            permissions: Object.values(ENUM_AUTH_PERMISSIONS),
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        },
        type: 'object',
    })
    @Transform(({ value }) => ({
        name: value.name,
        permissions: value.permissions.map(
            (val: Record<string, any>) => val.code
        ),
        accessFor: value.accessFor,
    }))
    readonly role: IUserRolePayload;

    @Exclude()
    readonly isActive: boolean;

    @Exclude()
    readonly passwordExpired: Date;
}
