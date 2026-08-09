import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ProjectUpdateSlugRequestDto {
    @ApiProperty({
        description:
            'New project slug. Charset [0-9a-zA-Z-], length capped by the project slug configuration (30 characters), unique per workspace',
        example: 'website-revamp',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    slug: string;
}
