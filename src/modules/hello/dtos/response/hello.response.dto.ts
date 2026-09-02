import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class HelloDateResponseDto {
    @ApiProperty({
        required: true,
        example: faker.date.recent(),
        description: 'Current server date as a Date object',
    })
    date: Date;

    @ApiProperty({
        required: true,
        example: '2022-08-10T07:22:17.231Z',
        description: 'Current server date as an ISO-8601 string',
    })
    iso: string;

    @ApiProperty({
        required: true,
        example: 1660190937231,
        description: 'Current server date as a Unix timestamp in milliseconds',
    })
    timestamp: number;
}

class HelloAppResponseDto {
    @ApiProperty({
        required: true,
        example: 'Ack NestJS Boilerplate',
        description: 'Application name',
    })
    name: string;

    @ApiProperty({
        required: true,
        example: EnumAppEnvironment.development,
        enum: EnumAppEnvironment,
        description: 'Runtime environment of the application',
    })
    env: EnumAppEnvironment;

    @ApiProperty({
        required: true,
        example: 'UTC',
        description: 'Timezone the application clock uses',
    })
    timezone: string;
}

class HelloMessageResponseDto {
    @ApiProperty({
        required: true,
        example: Object.values(EnumMessageLanguage),
        isArray: true,
        enum: EnumMessageLanguage,
        description: 'Languages the application can serve messages in',
    })
    availableLanguage: EnumMessageLanguage[];

    @ApiProperty({
        required: true,
        example: EnumMessageLanguage.en,
        enum: EnumMessageLanguage,
        description: 'Default language for application messages',
    })
    defaultLanguage: EnumMessageLanguage;
}

export class HelloResponseDto {
    @ApiProperty({
        required: true,
        type: () => HelloDateResponseDto,
        description: 'Current server date in several representations',
        example: {
            date: faker.date.recent(),
            iso: '2022-08-10T07:22:17.231Z',
            timestamp: 1660190937231,
        },
    })
    @Type(() => HelloDateResponseDto)
    date: HelloDateResponseDto;

    @ApiProperty({
        required: true,
        type: () => HelloAppResponseDto,
        description: 'Application identity and environment',
        example: {
            name: 'Ack NestJS Boilerplate',
            env: EnumAppEnvironment.development,
            timezone: 'UTC',
        },
    })
    @Type(() => HelloAppResponseDto)
    app: HelloAppResponseDto;

    @ApiProperty({
        required: true,
        type: () => HelloMessageResponseDto,
        description: 'Message language configuration',
        example: {
            availableLanguage: Object.values(EnumMessageLanguage),
            defaultLanguage: EnumMessageLanguage.en,
        },
    })
    @Type(() => HelloMessageResponseDto)
    message: HelloMessageResponseDto;
}
