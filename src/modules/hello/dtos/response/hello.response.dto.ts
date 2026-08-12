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
        type: () => HelloMessageResponseDto,
    })
    @Type(() => HelloMessageResponseDto)
    message: HelloMessageResponseDto;
}
