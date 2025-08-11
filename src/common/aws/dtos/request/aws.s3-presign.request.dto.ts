import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

/**
 * DTO for AWS S3 presigned URL request
 * @description Data transfer object used to validate and structure requests for generating S3 presigned URLs
 */
export class AwsS3PresignRequestDto {
    /**
     * The S3 object key/path
     * @description The unique identifier for the object in the S3 bucket
     */
    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
    })
    @IsNotEmpty()
    @IsString()
    key: string;

    /**
     * File size in bytes
     * @description The size of the file to be uploaded, must be a positive integer
     */
    @ApiProperty({
        required: true,
    })
    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @IsNotEmpty()
    size: number;
}

/**
 * DTO for AWS S3 multipart upload presigned URL request
 * @description Data transfer object for generating presigned URLs for specific parts in multipart uploads
 * @extends AwsS3PresignRequestDto
 */
export class AwsS3PresignPartRequestDto extends AwsS3PresignRequestDto {
    /**
     * Part number for multipart upload
     * @description The sequential number of the part in a multipart upload (starting from 1)
     */
    @ApiProperty({
        required: true,
        example: 1,
        description: 'Part number for multipart upload',
    })
    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @IsNotEmpty()
    partNumber: number;

    /**
     * Upload ID for multipart upload
     * @description The unique identifier for the multipart upload session
     */
    @ApiProperty({
        required: true,
        example: '1',
        description: 'Upload ID for multipart upload',
    })
    @IsString()
    @IsNotEmpty()
    uploadId: string;
}
