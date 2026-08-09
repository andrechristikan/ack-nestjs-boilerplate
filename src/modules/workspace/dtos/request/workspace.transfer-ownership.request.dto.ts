import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceTransferOwnershipRequestDto {
    @ApiProperty({
        description: 'User to transfer ownership to; must already be a workspace member',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    targetUserId: string;
}
