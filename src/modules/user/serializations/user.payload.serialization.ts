import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';

export class UserPayloadSerialization extends OmitType(
    UserProfileSerialization,
    ['photo', 'role', 'signUpDate', 'createdAt', 'updatedAt'] as const
) {
    @Exclude()
    readonly photo?: AwsS3Serialization;

    @ApiProperty({
        example: faker.datatype.uuid(),
        type: 'string',
    })
    @Transform(({ obj }) => `${obj.role._id}`)
    readonly role: string;

    @ApiProperty({
        example: ENUM_ROLE_TYPE.ADMIN,
        type: 'string',
        enum: ENUM_ROLE_TYPE,
    })
    @Expose()
    @Transform(({ obj }) => obj.role.type)
    readonly type: ENUM_ROLE_TYPE;

    @Exclude()
    readonly signUpDate: Date;

    @Exclude()
    readonly signUpFrom: ENUM_USER_SIGN_UP_FROM;

    readonly loginDate: Date;

    @Exclude()
    readonly createdAt: number;

    @Exclude()
    readonly updatedAt: number;
}
