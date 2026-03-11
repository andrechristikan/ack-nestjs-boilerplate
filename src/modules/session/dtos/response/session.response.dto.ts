import { DatabaseDto } from '@common/database/dtos/database.dto';
import { RequestGeoLocationResponseDto } from '@common/request/dtos/response/request.geo-location.response.dto';
import { RequestUserAgentResponseDto } from '@common/request/dtos/response/request.user-agent.response.dto';
import { faker } from '@faker-js/faker';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

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
        example: faker.string.uuid(),
    })
    deviceOwnershipId: string;

    @ApiHideProperty()
    @Exclude()
    jti: string;

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
        type: RequestGeoLocationResponseDto,
    })
    @Type(() => RequestGeoLocationResponseDto)
    geoLocation?: RequestGeoLocationResponseDto;

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

    @ApiProperty({
        required: false,
        example: faker.database.mongodbObjectId(),
    })
    revokedById?: string;

    @ApiProperty({
        required: true,
        type: UserListResponseDto,
    })
    @Type(() => UserListResponseDto)
    revokedBy: UserListResponseDto;
}
