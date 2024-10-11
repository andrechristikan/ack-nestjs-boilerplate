import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';

export class AwsS3ResponseDto extends OmitType(AwsS3Dto, [
    'bucket',
    'baseUrl',
    'filename',
    'mime',
    'path',
]) {
    @Exclude()
    @ApiHideProperty()
    bucket: string;

    @Exclude()
    @ApiHideProperty()
    path: string;

    @Exclude()
    @ApiHideProperty()
    filename: string;

    @Exclude()
    @ApiHideProperty()
    baseUrl: string;

    @Exclude()
    @ApiHideProperty()
    mime: string;
}
