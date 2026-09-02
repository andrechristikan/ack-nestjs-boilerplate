import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class WorkspaceJoinRequestResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the workspace the join request targets',
    })
    @Expose()
    workspaceId: string;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user who submitted the join request',
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumWorkspaceJoinRequestStatus.pending,
        enum: EnumWorkspaceJoinRequestStatus,
        description: 'Current status of the join request',
    })
    @Expose()
    status: EnumWorkspaceJoinRequestStatus;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.lorem.sentence(),
        description: 'Optional message from the requester',
    })
    @Expose()
    message: string | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: EnumWorkspaceJoinRejectReason.wrongWorkspace,
        enum: EnumWorkspaceJoinRejectReason,
        description: 'Coded reason when the join request was rejected',
    })
    @Expose()
    rejectReasonCode: EnumWorkspaceJoinRejectReason | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user who reviewed the join request',
    })
    @Expose()
    reviewedByUserId: string | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.date.recent(),
        description: 'When the join request was reviewed',
    })
    @Expose()
    reviewedAt: Date | null;
}
