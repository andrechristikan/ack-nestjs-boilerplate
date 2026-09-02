import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { RequestGeoLocationResponseDto } from '@common/request/dtos/response/request.geo-location.response.dto';
import { RequestUserAgentResponseDto } from '@common/request/dtos/response/request.user-agent.response.dto';
import { faker } from '@faker-js/faker';
import { UserRefResponseDto } from '@modules/user/dtos/response/user.ref.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class SessionResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user who owns the session',
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        type: UserRefResponseDto,
        description: 'Embedded user who owns the session',
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
        example: faker.string.uuid(),
        description: 'Identifier of the device ownership bound to the session',
    })
    @Expose()
    deviceOwnershipId: string;

    jti: string;

    @ApiProperty({
        required: true,
        example: faker.internet.ipv4(),
        description: 'IP address recorded for the session',
    })
    @Expose()
    ipAddress: string;

    @ApiProperty({
        required: true,
        type: RequestUserAgentResponseDto,
        description: 'Parsed user agent recorded for the session',
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
        description: 'Geo-location recorded for the session',
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
        required: true,
        example: faker.date.future(),
        description: 'When the session expires',
    })
    @Expose()
    expiredAt: Date;

    @ApiProperty({
        required: false,
        example: faker.date.future(),
        description: 'When the session was revoked',
    })
    @Expose()
    revokedAt?: Date;

    @ApiProperty({
        required: true,
        example: false,
        description: 'Whether the session has been revoked',
    })
    @Expose()
    isRevoked: boolean;

    @ApiProperty({
        required: false,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user who revoked the session',
    })
    @Expose()
    revokedById?: string;

    @ApiProperty({
        required: false,
        type: UserRefResponseDto,
        description: 'Embedded user who revoked the session',
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
    revokedBy?: UserRefResponseDto;
}
