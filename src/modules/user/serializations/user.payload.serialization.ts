import { OmitType } from '@nestjs/swagger';
import { Exclude, Transform } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { IUserRolePayload } from 'src/modules/user/interfaces/user.interface';
import { UserGetSerialization } from './user.get.serialization';

export class UserPayloadSerialization extends OmitType(UserGetSerialization, [
    'photo',
    'role',
    'isActive',
] as const) {
    @Exclude()
    readonly photo?: AwsS3Serialization;

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
}
