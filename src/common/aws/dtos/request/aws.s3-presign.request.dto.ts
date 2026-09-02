import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AwsS3PresignRequestDto {
    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
        description: 'Object key to presign in S3',
    })
    @IsNotEmpty()
    @IsString()
    key: string;

    @ApiProperty({
        required: true,
        example: faker.number.int({ min: 1, max: 10_485_760 }),
        description: 'Object size in bytes',
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

export class AwsS3PresignPartRequestDto extends AwsS3PresignRequestDto {
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

    @ApiProperty({
        required: true,
        example: '1',
        description: 'Upload ID for multipart upload',
    })
    @IsString()
    @IsNotEmpty()
    uploadId: string;
}
