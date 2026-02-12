import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ProjectMemberCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'User id to add as project member',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        required: true,
        description: 'Role name for project member',
        example: 'project-viewer',
    })
    @IsString()
    @IsNotEmpty()
    roleName: string;
}
