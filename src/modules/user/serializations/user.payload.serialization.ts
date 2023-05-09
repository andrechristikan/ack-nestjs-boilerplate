import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
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
    @ApiProperty({ enum: ENUM_POLICY_SUBJECT })
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty()
    action: string;
}

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

    @ApiProperty({
        type: () => UserPayloadPermissionSerialization,
        isArray: true,
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
