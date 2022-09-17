import { OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Types } from 'mongoose';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { UserGetSerialization } from './user.get.serialization';

export class UserListSerialization extends OmitType(UserGetSerialization, [
    'role',
    'photo',
    'passwordExpired',
] as const) {
    @Exclude()
    readonly role: Types.ObjectId;

    @Exclude()
    readonly photo?: AwsS3Serialization;

    @Exclude()
    readonly passwordExpired: Date;
}
