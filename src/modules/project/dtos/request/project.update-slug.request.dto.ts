import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ProjectUpdateSlugRequestDto {
    @ApiProperty({
        description: 'Project slug',
        example: 'q3-expansion',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    slug: string;
}
