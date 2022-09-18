import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';

export class AwsS3MultipartPartsSerialization {
    @ApiProperty({
        example: faker.random.alpha(10),
        description: 'ETag from aws after init multipart',
    })
    @Type(() => String)
    ETag: string;

    @ApiProperty({
        example: 1,
    })
    @Type(() => Number)
    PartNumber: number;
}

export class AwsS3MultipartSerialization extends PartialType(
    AwsS3Serialization
) {
    @ApiProperty({
        example: faker.random.alpha(20),
        description: 'Upload id from aws after init multipart',
    })
    @Type(() => String)
    uploadId: string;

    @ApiProperty({
        example: 1,
        description: 'Last part number uploaded',
    })
    @Type(() => Number)
    partNumber?: number;

    @ApiProperty({
        example: 200,
        description: 'Max part number, or length of the chunk',
    })
    @Type(() => Number)
    maxPartNumber?: number;

    @ApiProperty({
        oneOf: [
            {
                $ref: getSchemaPath(AwsS3MultipartPartsSerialization),
                type: 'array',
            },
        ],
    })
    @Type(() => AwsS3MultipartPartsSerialization)
    parts?: AwsS3MultipartPartsSerialization[];
}
