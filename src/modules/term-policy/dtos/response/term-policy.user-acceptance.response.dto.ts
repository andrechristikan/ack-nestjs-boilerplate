import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { faker } from '@faker-js/faker';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { UserRefResponseDto } from '@modules/user/dtos/response/user.ref.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client';
import { Expose, Type } from 'class-transformer';

export class TermPolicyUserAcceptanceResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        description: 'Identifier of the user who accepted the terms or policy',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @Expose()
    readonly userId: string;

    @ApiProperty({
        required: true,
        type: UserRefResponseDto,
        description: 'Embedded user who accepted the terms or policy',
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
    readonly user: UserRefResponseDto;

    @ApiProperty({
        description: 'Identifier of the terms or policy accepted',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @Expose()
    readonly termPolicyId: string;

    @ApiProperty({
        required: true,
        type: TermPolicyResponseDto,
        description: 'Embedded terms or policy that was accepted',
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            type: EnumTermPolicyType.termsOfService,
            status: EnumTermPolicyStatus.draft,
            contents: [],
            version: 1,
            publishedAt: '2023-01-01T00:00:00.000Z',
        },
    })
    @Expose()
    @Type(() => TermPolicyResponseDto)
    readonly termPolicy: TermPolicyResponseDto;

    @ApiProperty({
        description: 'Date when the terms or policy was accepted',
        example: faker.date.recent(),
        required: true,
    })
    @Expose()
    readonly acceptedAt: Date;
}
