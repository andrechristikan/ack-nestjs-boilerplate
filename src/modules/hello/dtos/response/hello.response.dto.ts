import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class HelloDateResponseDto {
    @ApiProperty({
        required: true,
        example: faker.date.recent(),
    })
    date: Date;

    @ApiProperty({
        required: true,
        example: '2022-08-10T07:22:17.231Z',
    })
    iso: string;

    @ApiProperty({
        required: true,
        example: 1660190937231,
    })
    timestamp: number;
}

class HelloAppResponseDto {
    @ApiProperty({
        required: true,
        example: 'Ack NestJS Boilerplate',
    })
    name: string;

    @ApiProperty({
        required: true,
        example: EnumAppEnvironment.development,
        enum: EnumAppEnvironment,
    })
    env: EnumAppEnvironment;

    @ApiProperty({
        required: true,
        example: 'UTC',
    })
    timezone: string;
}

class HelloAuthResponseDto {
    @ApiProperty({
        required: true,
        example: true,
    })
    passwordAttempt: boolean;

    @ApiProperty({
        required: true,
        example: 10,
    })
    passwordMaxAttempt: number;

    @ApiProperty({
        required: true,
        example: 86400,
    })
    passwordExpiredIn: number;

    @ApiProperty({
        required: true,
        example: 3600,
    })
    passwordExpiredInTemporary: number;

    @ApiProperty({
        required: true,
        example: 31536000,
    })
    passwordPeriod: number;
}

class HelloMessageResponseDto {
    @ApiProperty({
        required: true,
        example: Object.values(EnumMessageLanguage),
        isArray: true,
        enum: EnumMessageLanguage,
    })
    availableLanguage: EnumMessageLanguage[];

    @ApiProperty({
        required: true,
        example: EnumMessageLanguage.en,
        enum: EnumMessageLanguage,
    })
    defaultLanguage: EnumMessageLanguage;
}

class HelloRequestResponseDto {
    @ApiProperty({
        required: true,
        example: 5000,
    })
    timeoutInMs: number;

    @ApiProperty({
        required: true,
        example: 1048576,
    })
    bodyJsonLimitInBytes: number;

    @ApiProperty({
        required: true,
        example: 1048576,
    })
    bodyRawLimitInBytes: number;

    @ApiProperty({
        required: true,
        example: 1048576,
    })
    bodyTextLimitInBytes: number;

    @ApiProperty({
        required: true,
        example: 1048576,
    })
    bodyUrlencodedLimitInBytes: number;

    @ApiProperty({
        required: true,
        example: 1048576,
    })
    bodyApplicationOctetStreamLimitInBytes: number;

    @ApiProperty({
        required: true,
        example: 60000,
    })
    throttleTtlInMs: number;

    @ApiProperty({
        required: true,
        example: 100,
    })
    throttleLimit: number;
}

export class HelloResponseDto {
    @ApiProperty({
        required: true,
        type: () => HelloDateResponseDto,
    })
    @Type(() => HelloDateResponseDto)
    date: HelloDateResponseDto;

    @ApiProperty({
        required: true,
        type: () => HelloAppResponseDto,
    })
    @Type(() => HelloAppResponseDto)
    app: HelloAppResponseDto;

    @ApiProperty({
        required: true,
        type: () => HelloAuthResponseDto,
    })
    @Type(() => HelloAuthResponseDto)
    auth: HelloAuthResponseDto;

    @ApiProperty({
        required: true,
        type: () => HelloMessageResponseDto,
    })
    @Type(() => HelloMessageResponseDto)
    message: HelloMessageResponseDto;

    @ApiProperty({
        required: true,
        type: () => HelloRequestResponseDto,
    })
    @Type(() => HelloRequestResponseDto)
    request: HelloRequestResponseDto;
}
