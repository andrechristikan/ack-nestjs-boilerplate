import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AwsS3PresignRequestDto {
    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
    })
    @IsNotEmpty()
    @IsString()
    key: string;

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

export class AwsS3PresignPartRequestDto extends AwsS3PresignRequestDto {
    @ApiProperty({
        required: true,
        example: 1,
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
        example: 1,
    })
    @IsString()
    @IsNotEmpty()
    uploadId: string;
}
