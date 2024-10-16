import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class AwsS3Dto {
    @ApiProperty({
        required: true,
        nullable: false,
    })
    bucket: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.system.directoryPath(),
    })
    path: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.system.filePath(),
    })
    pathWithFilename: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.system.fileName(),
    })
    filename: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
    })
    completedUrl: string;

    @ApiProperty({
        required: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
    })
    cdnUrl?: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.internet.url(),
    })
    baseUrl: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.system.mimeType(),
    })
    mime: string;

    @ApiProperty({
        required: false,
        nullable: true,
    })
    duration?: number;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    size: number;
}
