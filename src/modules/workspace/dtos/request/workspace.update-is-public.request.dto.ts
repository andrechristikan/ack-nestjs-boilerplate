import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class WorkspaceUpdateIsPublicRequestDto {
    @ApiProperty({
        description:
            'Whether the workspace is publicly discoverable and accepts join requests',
        example: false,
        required: true,
    })
    @IsBoolean()
    @IsNotEmpty()
    isPublic: boolean;
}
