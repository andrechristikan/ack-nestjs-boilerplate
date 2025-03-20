import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class AwsS3PresignRequestDto {
    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
        description: 'key of aws s3',
    })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({
        required: true,
        example: 1000,
        description: 'Unit in milliseconds',
    })
    @IsInt()
    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsOptional()
    duration?: number;

    @ApiProperty({
        required: true,
        example: 1,
        description: 'Unit in bytes',
    })
    @Min(1)
    @IsInt()
    @IsNotEmpty()
    size: number;
}
