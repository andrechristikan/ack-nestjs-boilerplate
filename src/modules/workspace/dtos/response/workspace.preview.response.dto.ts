import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/** Public workspace profile resolved by slug for an unauthenticated caller. Every audit column is excluded, so a guessable slug reveals nothing about who runs the workspace. */
export class WorkspacePreviewResponseDto extends DatabaseResponseDto {
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

    @ApiHideProperty()
    @Exclude()
    createdBy: string | null;

    @ApiHideProperty()
    @Exclude()
    updatedBy: string | null;

    @ApiHideProperty()
    @Exclude()
    deletedBy: string | null;
}
