import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { RequestGeoLocationResponseDto } from '@common/request/dtos/response/request.geo-location.response.dto';
import { RequestUserAgentResponseDto } from '@common/request/dtos/response/request.user-agent.response.dto';
import { faker } from '@faker-js/faker';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class SessionResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        type: UserListResponseDto,
    })
    @Expose()
    @Type(() => UserListResponseDto)
    user: UserListResponseDto;

    @ApiProperty({
        required: true,
        example: faker.string.uuid(),
    })
    @Expose()
    deviceOwnershipId: string;

    jti: string;

    @ApiProperty({
        required: true,
        example: faker.internet.ipv4(),
    })
    @Expose()
    ipAddress: string;

    @ApiProperty({
        required: true,
        type: RequestUserAgentResponseDto,
    })
    @Expose()
    @Type(() => RequestUserAgentResponseDto)
    userAgent: RequestUserAgentResponseDto;

    @ApiProperty({
        required: false,
        type: RequestGeoLocationResponseDto,
    })
    @Expose()
    @Type(() => RequestGeoLocationResponseDto)
    geoLocation?: RequestGeoLocationResponseDto;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
    })
    @Expose()
    expiredAt: Date;

    @ApiProperty({
        required: false,
        example: faker.date.future(),
    })
    @Expose()
    revokedAt?: Date;

    @ApiProperty({
        required: true,
        example: false,
    })
    @Expose()
    isRevoked: boolean;

    @ApiProperty({
        required: false,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    revokedById?: string;

    @ApiProperty({
        required: true,
        type: UserListResponseDto,
    })
    @Expose()
    @Type(() => UserListResponseDto)
    revokedBy: UserListResponseDto;
}
