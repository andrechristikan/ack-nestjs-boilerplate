import { AwsS3ResponseDto } from '@common/aws/dtos/response/aws.s3.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Minimal user shape embedded in another module's response.
 */
export class UserRefResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: false,
        maxLength: 100,
        minLength: 1,
        description: 'Display name of the user',
        example: faker.person.fullName(),
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: true,
        maxLength: 50,
        minLength: 3,
        description: 'Unique username of the user',
        example: faker.internet.username().toLowerCase(),
    })
    @Expose()
    username: Lowercase<string>;

    @ApiProperty({
        required: false,
        type: AwsS3ResponseDto,
        description: 'Profile photo stored in S3',
        example: {
            bucket: faker.string.alpha({ length: 10, casing: 'upper' }),
            key: faker.system.filePath(),
            cdnUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
            completedUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
            mime: 'image/jpeg',
            extension: 'jpg',
            access: EnumAwsS3Accessibility.public,
            size: 1024,
        },
    })
    @Expose()
    @Type(() => AwsS3ResponseDto)
    photo?: AwsS3ResponseDto;
}
