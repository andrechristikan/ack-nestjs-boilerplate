import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApiKeyCreateDto {
    @ApiProperty({
        description: 'Api Key name',
        example: `testapiname`,
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name: string;

    @ApiProperty({
        description: 'Description of api key',
        example: 'blabla description',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    description?: string;
}

export class ApiKeyCreateRawDto extends PartialType(ApiKeyCreateDto) {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    key: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    secret: string;
}
