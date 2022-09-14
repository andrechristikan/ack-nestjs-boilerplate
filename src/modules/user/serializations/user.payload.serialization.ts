import { OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { UserGetSerialization } from './user.get.serialization';

export class UserPayloadSerialization extends OmitType(UserGetSerialization, [
    'photo',
] as const) {
    @Exclude()
    readonly photo?: AwsS3Serialization;
}
