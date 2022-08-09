import { OmitType } from '@nestjs/mapped-types';
import { Exclude } from 'class-transformer';
import { IAwsS3 } from 'src/common/aws/aws.interface';
import { UserGetSerialization } from './user.get.serialization';

export class UserPayloadSerialization extends OmitType(UserGetSerialization, [
    'photo',
] as const) {
    @Exclude()
    readonly photo?: IAwsS3;
}
