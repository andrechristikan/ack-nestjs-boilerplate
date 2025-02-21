import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from 'src/modules/aws/dtos/aws.s3-multipart.dto';
import { AwsS3PresignResponseDto } from 'src/modules/aws/dtos/response/aws.s3-presign.response.dto';

export class AwsS3PresignMultiPartResponseDto extends IntersectionType(
    AwsS3PresignResponseDto,
    PartialType(
        IntersectionType(
            PickType(AwsS3MultipartPartDto, ['partNumber', 'eTag'] as const),
            PickType(AwsS3MultipartDto, ['uploadId'] as const)
        )
    )
) {}
