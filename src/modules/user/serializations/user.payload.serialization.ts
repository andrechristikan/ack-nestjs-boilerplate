import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import {
    ENUM_AUTH_LOGIN_FROM,
    ENUM_AUTH_LOGIN_WITH,
} from 'src/common/auth/constants/auth.enum.constant';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import {
    ENUM_POLICY_REQUEST_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import { IPolicyRule } from 'src/common/policy/interfaces/policy.interface';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';
export class UserPayloadPermissionSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_POLICY_SUBJECT,
        example: ENUM_POLICY_SUBJECT.API_KEY,
    })
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    action: string;
}

export class UserPayloadSerialization extends OmitType(
    UserProfileSerialization,
    ['photo', 'role', 'signUpDate', 'createdAt', 'updatedAt'] as const
) {
    @ApiHideProperty()
    @Exclude()
    readonly photo?: AwsS3Serialization;

    @ApiProperty({
        example: [faker.string.uuid()],
        type: 'string',
        isArray: true,
        required: true,
        nullable: false,
    })
    @Transform(({ obj }) => `${obj.role._id}`)
    readonly role: string;

    @ApiProperty({
        example: ENUM_ROLE_TYPE.ADMIN,
        type: 'string',
        enum: ENUM_ROLE_TYPE,
        required: true,
        nullable: false,
    })
    @Expose()
    @Transform(({ obj }) => obj.role.type)
    readonly type: ENUM_ROLE_TYPE;

    @ApiProperty({
        type: UserPayloadPermissionSerialization,
        isArray: true,
        required: true,
        nullable: false,
    })
    @Transform(({ obj }) => {
        return obj.role.permissions.map(({ action, subject }: IPolicyRule) => {
            const ac = action.map(
                (l) => ENUM_POLICY_REQUEST_ACTION[l.toUpperCase()]
            );
            return {
                subject,
                action: ac.join(','),
            };
        });
    })
    @Expose()
    readonly permissions: UserPayloadPermissionSerialization[];

    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_AUTH_LOGIN_FROM,
    })
    readonly loginFrom: ENUM_AUTH_LOGIN_FROM;

    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_AUTH_LOGIN_WITH,
    })
    readonly loginWith: ENUM_AUTH_LOGIN_WITH;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    readonly loginDate: Date;

    @ApiHideProperty()
    @Exclude()
    readonly passwordExpired: Date;

    @ApiHideProperty()
    @Exclude()
    readonly passwordCreated: Date;

    @ApiHideProperty()
    @Exclude()
    readonly signUpDate: Date;

    @ApiHideProperty()
    @Exclude()
    readonly signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiHideProperty()
    @Exclude()
    readonly createdAt: number;

    @ApiHideProperty()
    @Exclude()
    readonly updatedAt: number;
}
