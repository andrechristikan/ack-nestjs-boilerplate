import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AwsS3Dto } from '@module/aws/dtos/aws.s3.dto';

export class AwsS3ResponseDto extends OmitType(AwsS3Dto, ['bucket'] as const) {
    @Exclude()
    @ApiHideProperty()
    bucket: string;
}
