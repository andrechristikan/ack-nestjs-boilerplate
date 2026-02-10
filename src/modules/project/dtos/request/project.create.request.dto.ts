import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ProjectCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'Project name',
        example: 'Q3 Expansion',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;
}
