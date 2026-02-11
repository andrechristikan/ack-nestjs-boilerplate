import { DatabaseDto } from '@common/database/dtos/database.dto';
import { RequestUserAgentResponseDto } from '@common/request/dtos/reasponse/request.user-agent.response.dto';
import { faker } from '@faker-js/faker';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SessionResponseDto extends DatabaseDto {
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
        required: true,
        example: faker.date.future(),
    })
    expiredAt: Date;

    @ApiProperty({
        required: false,
        example: faker.date.future(),
    })
    revokedAt?: Date;

    @ApiProperty({
        required: true,
        example: false,
    })
    isRevoked: boolean;
}
