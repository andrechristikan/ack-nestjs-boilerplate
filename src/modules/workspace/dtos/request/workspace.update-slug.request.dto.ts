import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceUpdateSlugRequestDto {
    @ApiProperty({
        description:
            'New workspace slug. Charset [0-9a-zA-Z-], length capped by the workspace slug configuration (30 characters)',
        example: 'acme-team',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    slug: string;
}
