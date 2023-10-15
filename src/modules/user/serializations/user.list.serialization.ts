import { ApiHideProperty, ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { RoleListSerialization } from 'src/modules/role/serializations/role.list.serialization';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';

export class UserListSerialization extends OmitType(UserProfileSerialization, [
    'photo',
    'signUpDate',
    'signUpFrom',
    'role',
] as const) {
    @ApiProperty({
        type: RoleListSerialization,
        required: true,
        nullable: false,
    })
    @Type(() => RoleListSerialization)
    readonly role: RoleListSerialization;

    @ApiHideProperty()
    @Exclude()
    readonly photo?: AwsS3Serialization;

    @ApiHideProperty()
    @Exclude()
    readonly signUpDate: Date;
}
