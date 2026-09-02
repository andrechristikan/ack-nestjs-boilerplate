import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { faker } from '@faker-js/faker';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import { UserRefResponseDto } from '@modules/user/dtos/response/user.ref.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class WorkspaceMemberResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the workspace the member belongs to',
    })
    @Expose()
    workspaceId: string;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the member user',
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        type: UserRefResponseDto,
        description: 'Embedded user of this workspace member',
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
        example: EnumWorkspaceMemberRole.member,
        enum: EnumWorkspaceMemberRole,
        description: 'Workspace role of the member',
    })
    @Expose()
    role: EnumWorkspaceMemberRole;

    @ApiProperty({
        required: true,
        example: faker.date.past(),
        description: 'When the user joined the workspace',
    })
    @Expose()
    joinedAt: Date;
}
