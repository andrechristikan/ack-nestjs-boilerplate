import { OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';

export class UserListSerialization extends OmitType(UserProfileSerialization, [
    'role',
    'photo',
    'signUpDate',
] as const) {
    @Exclude()
    readonly role: string;

    @Exclude()
    readonly photo?: AwsS3Serialization;

    @Exclude()
    readonly signUpDate: Date;
}
