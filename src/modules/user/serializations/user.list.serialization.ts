import { OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { UserGetSerialization } from './user.get.serialization';

export class UserListSerialization extends OmitType(UserGetSerialization, [
    'role',
    'photo',
    'passwordExpired',
    'passwordAttempt',
    'signUpDate',
] as const) {
    @Exclude()
    readonly role: string;

    @Exclude()
    readonly photo?: AwsS3Serialization;

    @Exclude()
    readonly passwordExpired: Date;

    @Exclude()
    readonly passwordAttempt: number;

    @Exclude()
    readonly signUpDate: Date;
}
