import { DatabaseDto } from '@common/database/dtos/database.dto';
import { RequestUserAgentResponseDto } from '@common/request/dtos/reasponse/request.user-agent.response.dto';
import { faker } from '@faker-js/faker';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EnumActivityLogAction } from '@prisma/client';
import { Type } from 'class-transformer';

export class ActivityLogResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    userId: string;

    @ApiProperty({
        required: true,
        type: UserListResponseDto,
    })
    @Type(() => UserListResponseDto)
    user: UserListResponseDto;

    @ApiProperty({
        required: true,
        example: EnumActivityLogAction.userLoginCredential,
        enum: EnumActivityLogAction,
    })
    action: EnumActivityLogAction;

    @ApiProperty({
        required: true,
        example: faker.internet.ipv4(),
    })
    ipAddress: string;

    @ApiProperty({
        required: true,
        type: RequestUserAgentResponseDto,
    })
    @Type(() => RequestUserAgentResponseDto)
    userAgent: RequestUserAgentResponseDto;

    @ApiProperty({
        required: false,
        example: { exampleKey: 'exampleValue' },
    })
    metadata?: unknown;
}
