import { faker } from '@faker-js/faker';
import { EnumProjectMemberRole } from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class ProjectMemberAssignRequestDto {
    @ApiProperty({
        description: 'User id to assign to the project; must already be a member of the parent workspace',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    userId: string;

    @ApiProperty({
        description:
            'Project member role; assigning admin requires the caller to be workspace owner or admin',
        example: EnumProjectMemberRole.member,
        enum: EnumProjectMemberRole,
        required: true,
    })
    @IsNotEmpty()
    @IsEnum(EnumProjectMemberRole)
    role: EnumProjectMemberRole;
}
