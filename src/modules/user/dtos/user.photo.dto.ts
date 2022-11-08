import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';

export class UserPhotoDto {
    @ValidateNested()
    @Type(() => AwsS3Serialization)
    photo: AwsS3Serialization;
}
