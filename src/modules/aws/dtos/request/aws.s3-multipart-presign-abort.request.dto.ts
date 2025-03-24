import { PickType } from '@nestjs/swagger';
import { AwsS3MultipartPresignCompleteRequestDto } from 'src/modules/aws/dtos/request/aws.s3-multipart-presign-complete.request.dto';
import { AwsS3PartPresignRequestDto } from 'src/modules/aws/dtos/request/aws.s3-part-resign.request.dto';

export class AwsS3MultipartPresignAbortRequestDto extends AwsS3MultipartPresignCompleteRequestDto {}
