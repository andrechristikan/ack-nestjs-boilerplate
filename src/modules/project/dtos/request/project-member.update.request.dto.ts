import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectMemberStatus } from '@generated/prisma-client';
import {
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class ProjectMemberUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Role id',
        example: '65f3d2e44b9a7e1bd2c9a8f1',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @IsMongoId()
    roleId?: string;

    @ApiProperty({
        required: false,
        description: 'Project member status',
        enum: EnumProjectMemberStatus,
    })
    @IsOptional()
    @IsEnum(EnumProjectMemberStatus)
    status?: EnumProjectMemberStatus;
}
