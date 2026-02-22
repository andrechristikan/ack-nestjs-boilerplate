import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

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
        description: 'Role id for project member',
        example: '65f3d2e44b9a7e1bd2c9a8f1',
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    roleId: string;
}
