import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { RequestGeoLocationResponseDto } from '@common/request/dtos/response/request.geo-location.response.dto';
import { RequestUserAgentResponseDto } from '@common/request/dtos/response/request.user-agent.response.dto';
import { faker } from '@faker-js/faker';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { Expose, Type } from 'class-transformer';

export class ActivityLogResponseDto extends DatabaseResponseDto {
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
        example: EnumActivityLogAction.userLoginCredential,
        enum: EnumActivityLogAction,
    })
    @Expose()
    action: EnumActivityLogAction;

    @ApiProperty({
        required: true,
        example: 'User login with credential',
        description: 'Description of the activity log',
    })
    @Expose()
    description: string;

    @ApiProperty({
        required: true,
        example: faker.internet.ipv4(),
        description: 'IP address of the user performing the action',
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
        required: false,
        example: { exampleKey: 'exampleValue' },
        description: 'Additional metadata related to the activity log',
    })
    @Expose()
    metadata?: unknown;
}
