import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceSwitchRequestDto {
    @ApiProperty({
        description: 'Workspace to switch into; caller must already be a member',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    workspaceId: string;
}
