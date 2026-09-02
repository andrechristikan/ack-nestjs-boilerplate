import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { faker } from '@faker-js/faker';
import { UserRefResponseDto } from '@modules/user/dtos/response/user.ref.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EnumPasswordHistoryType } from '@generated/prisma-client';
import { Expose, Type } from 'class-transformer';

export class PasswordHistoryResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user whose password history this is',
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        type: UserRefResponseDto,
        description: 'Embedded user whose password history this is',
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

    password: string;

    @ApiProperty({
        required: true,
        example: EnumPasswordHistoryType.admin,
        enum: EnumPasswordHistoryType,
        description: 'How this password history entry was created',
    })
    @Expose()
    type: EnumPasswordHistoryType;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
        description: 'When this password history entry expires',
    })
    @Expose()
    expiredAt: Date;
}
