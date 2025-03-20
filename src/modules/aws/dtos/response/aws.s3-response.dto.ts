import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';

export class AwsS3ResponseDto extends OmitType(AwsS3Dto, ['bucket', 'mime']) {
    @Exclude()
    @ApiHideProperty()
    bucket: string;

    @Exclude()
    @ApiHideProperty()
    mime: string;
}
