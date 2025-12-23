import { PickType } from '@nestjs/swagger';
import { AwsS3PresignRequestDto } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

export class UserGenerateImportRequestDto extends PickType(
    AwsS3PresignRequestDto,
    ['size']
) {}
