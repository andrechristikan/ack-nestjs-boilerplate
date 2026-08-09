import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import { UserRefResponseDto } from '@modules/user/dtos/response/user.ref.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class WorkspaceMemberResponseDto extends DatabaseResponseDto {
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
        type: UserRefResponseDto,
    })
    @Expose()
    @Type(() => UserRefResponseDto)
    user: UserRefResponseDto;

    @ApiProperty({
        required: true,
        example: EnumWorkspaceMemberRole.member,
        enum: EnumWorkspaceMemberRole,
    })
    @Expose()
    role: EnumWorkspaceMemberRole;

    @ApiProperty({
        required: true,
        example: faker.date.past(),
    })
    @Expose()
    joinedAt: Date;
}
