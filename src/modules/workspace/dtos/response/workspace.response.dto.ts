import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class WorkspaceResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        description: 'Workspace name',
        example: 'Acme',
    })
    @Expose()
    name: string;

    @ApiProperty({
        required: true,
        description: 'Workspace slug',
        example: 'acme-team',
    })
    @Expose()
    slug: string;

    @ApiProperty({
        required: false,
        description: 'Workspace description',
        example: 'Our team workspace',
        nullable: true,
    })
    @Expose()
    description: string | null;

    @ApiProperty({
        required: true,
        description: 'Whether the workspace is publicly discoverable for join requests',
        example: false,
    })
    @Expose()
    isPublic: boolean;
}
