import { PickType } from '@nestjs/swagger';
import { AwsS3PartPresignRequestDto } from 'src/modules/aws/dtos/request/aws.s3-part-resign.request.dto';

export class AwsS3MultipartPresignCompleteRequestDto extends PickType(
    AwsS3PartPresignRequestDto,
    ['key', 'uploadId'] as const
) {}
