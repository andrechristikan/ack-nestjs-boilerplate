import { faker } from '@faker-js/faker';
import { AwsS3MultipartPartDto } from '@common/aws/dtos/aws.s3-multipart.dto';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';

/**
 * DTO for AWS S3 presigned URL response
 * @description Data Transfer Object that contains presigned URL information for S3 uploads.
 * Extends selected properties from AwsS3Dto including key, mime type, and file extension.
 */
export class AwsS3PresignDto extends PickType(AwsS3Dto, [
    'key',
    'mime',
    'extension',
]) {
    /**
     * Presigned URL for S3 upload
     * @description Temporary URL that allows direct upload to S3 without exposing AWS credentials
     */
    @ApiProperty({
        required: true,
        example: faker.internet.url(),
        description: 'Presigned URL for uploading the object to S3',
    })
    presignUrl: string;

    /**
     * URL expiration time in milliseconds
     * @description Time in milliseconds after which the presigned URL will expire and become invalid
     */
    @ApiProperty({
        required: true,
        example: 10000,
        description: 'Expired in millisecond for each presign url',
    })
    expiredIn: number;
}

/**
 * DTO for AWS S3 presigned URL with multipart information
 * @description Extended DTO that combines presigned URL information with multipart upload details.
 * Includes size and part number properties for multipart uploads to S3.
 * @see AwsS3PresignDto
 * @see AwsS3MultipartPartDto
 */
export class AwsS3PresignPartDto extends IntersectionType(
    AwsS3PresignDto,
    PickType(AwsS3MultipartPartDto, ['size', 'partNumber'] as const)
) {}
