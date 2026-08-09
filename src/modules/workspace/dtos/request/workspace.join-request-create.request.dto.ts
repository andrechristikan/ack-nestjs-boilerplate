import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class WorkspaceJoinRequestCreateRequestDto {
    @ApiProperty({
        description: 'Workspace to request joining; must be isPublic and not soft-deleted',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    workspaceId: string;

    @ApiProperty({
        description: 'Optional note to the workspace owners/admins reviewing the request',
        example: faker.lorem.sentence(),
        required: false,
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    message?: string;
}
