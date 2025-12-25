import { faker } from '@faker-js/faker';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';

/**
 * DTO representing a single part in AWS S3 multipart upload.
 * Contains information about an individual part of a multipart upload including ETag, part number, and size.
 * Extends selected properties from AwsS3Dto.
 */
export class AwsS3MultipartPartDto extends PickType(AwsS3Dto, [
    'size',
] as const) {
    /**
     * ETag of the uploaded part
     * @description The entity tag returned by AWS S3 after uploading a part, used for validation and integrity checking
     */
    @ApiProperty({
        required: true,
        example: faker.string.alpha({ length: 10, casing: 'upper' }),
        description: 'ETag from aws after init multipart',
    })
    eTag: string;

    /**
     * Part number in the multipart upload
     * @description Sequential number identifying this part within the multipart upload (starting from 1)
     */
    @ApiProperty({
        required: true,
        example: 1,
        description: 'Part number in the multipart upload',
    })
    partNumber: number;
}

/**
 * DTO for AWS S3 multipart upload information.
 * Contains comprehensive information about a multipart upload session including upload ID, part tracking, and uploaded parts.
 */
export class AwsS3MultipartDto extends AwsS3Dto {
    /**
     * Unique identifier for the multipart upload session
     * @description The upload ID returned by AWS S3 when initiating a multipart upload, used to identify the upload session
     */
    @ApiProperty({
        required: true,
        example: faker.string.alpha({ length: 20, casing: 'upper' }),
        description: 'Upload id from aws after init multipart',
    })
    uploadId: string;

    /**
     * Last part number that was uploaded
     * @description The highest part number that has been successfully uploaded in this multipart upload session
     */
    @ApiProperty({
        required: true,
        example: 1,
        description: 'Last part number uploaded',
    })
    lastPartNumber: number;

    /**
     * Maximum part number for this upload
     * @description The total number of parts expected for this multipart upload, represents the length of the chunk array
     */
    @ApiProperty({
        required: true,
        example: 200,
        description: 'Max part number, or length of the chunk',
    })
    maxPartNumber: number;

    /**
     * Array of uploaded parts
     * @description Collection of all parts that have been uploaded for this multipart upload session
     */
    @ApiProperty({
        required: true,
        type: [AwsS3MultipartPartDto],
    })
    @Type(() => AwsS3MultipartPartDto)
    parts: AwsS3MultipartPartDto[];
}
