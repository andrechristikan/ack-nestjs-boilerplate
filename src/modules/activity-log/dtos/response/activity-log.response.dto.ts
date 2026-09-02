import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { RequestGeoLocationResponseDto } from '@common/request/dtos/response/request.geo-location.response.dto';
import { RequestUserAgentResponseDto } from '@common/request/dtos/response/request.user-agent.response.dto';
import { faker } from '@faker-js/faker';
import { UserRefResponseDto } from '@modules/user/dtos/response/user.ref.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { Expose, Type } from 'class-transformer';

export class ActivityLogResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user who performed the action',
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        type: UserRefResponseDto,
        description: 'Embedded user who performed the action',
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            name: faker.person.fullName(),
            username: faker.internet.username().toLowerCase(),
            photo: {
                bucket: faker.string.alpha({ length: 10, casing: 'upper' }),
                key: faker.system.filePath(),
                cdnUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                completedUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                mime: 'image/jpeg',
                extension: 'jpg',
                access: EnumAwsS3Accessibility.public,
                size: 1024,
            },
        },
    })
    @Expose()
    @Type(() => UserRefResponseDto)
    user: UserRefResponseDto;

    @ApiProperty({
        required: true,
        example: EnumActivityLogAction.userLoginCredential,
        enum: EnumActivityLogAction,
        description: 'Action recorded in the activity log',
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
        description: 'Parsed user agent of the request that produced the log',
        example: {
            ua: faker.internet.userAgent(),
            browser: {
                name: 'Chrome',
                version: '112.0.5615.49',
                major: '112',
                type: 'mobile',
            },
            cpu: {
                architecture: 'amd64',
            },
            device: {
                type: 'mobile',
                vendor: 'Apple',
                model: 'iPhone',
            },
            engine: {
                name: 'WebKit',
                version: '537.36',
            },
            os: {
                name: 'iOS',
                version: '16.3.1',
            },
        },
    })
    @Expose()
    @Type(() => RequestUserAgentResponseDto)
    userAgent: RequestUserAgentResponseDto;

    @ApiProperty({
        required: false,
        type: RequestGeoLocationResponseDto,
        description: 'Geo-location of the request that produced the log',
        example: {
            latitude: faker.location.latitude(),
            longitude: faker.location.longitude(),
            country: faker.location.country(),
            region: faker.location.state(),
            city: faker.location.city(),
        },
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
