import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';

export class AwsS3MultipartPartDto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.string.alpha({ length: 10, casing: 'upper' }),
        description: 'ETag from aws after init multipart',
    })
    @Type(() => String)
    eTag: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 1,
    })
    @Type(() => Number)
    partNumber: number;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 1,
    })
    @Type(() => Number)
    size: number;
}

export class AwsS3MultipartDto extends AwsS3Dto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.string.alpha({ length: 20, casing: 'upper' }),
        description: 'Upload id from aws after init multipart',
    })
    @Type(() => String)
    uploadId: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 1,
        description: 'Last part number uploaded',
    })
    @Type(() => Number)
    lastPartNumber: number;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 200,
        description: 'Max part number, or length of the chunk',
    })
    @Type(() => Number)
    maxPartNumber: number;

    @ApiProperty({
        required: true,
        nullable: false,
        oneOf: [
            {
                $ref: getSchemaPath(AwsS3MultipartPartDto),
                type: 'array',
            },
        ],
    })
    @Type(() => AwsS3MultipartPartDto)
    parts: AwsS3MultipartPartDto[];
}
