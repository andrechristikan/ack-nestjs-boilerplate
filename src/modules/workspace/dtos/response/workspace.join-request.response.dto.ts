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
    })
    @Expose()
    workspaceId: string;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumWorkspaceJoinRequestStatus.pending,
        enum: EnumWorkspaceJoinRequestStatus,
    })
    @Expose()
    status: EnumWorkspaceJoinRequestStatus;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.lorem.sentence(),
    })
    @Expose()
    message: string | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: EnumWorkspaceJoinRejectReason.wrongWorkspace,
        enum: EnumWorkspaceJoinRejectReason,
    })
    @Expose()
    rejectReasonCode: EnumWorkspaceJoinRejectReason | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    reviewedByUserId: string | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.date.recent(),
    })
    @Expose()
    reviewedAt: Date | null;
}
