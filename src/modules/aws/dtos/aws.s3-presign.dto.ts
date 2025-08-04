import { faker } from '@faker-js/faker/locale/af_ZA';
import { ApiProperty } from '@nestjs/swagger';

export class AwsS3PresignDto {
    @ApiProperty({
        required: true,
        example: faker.internet.url(),
    })
    presignUrl: string;

    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
    })
    key: string;

    @ApiProperty({
        required: true,
        example: 10000,
        description: 'Expired in millisecond for each presign url',
    })
    expiredIn: number;

    @ApiProperty({
        required: true,
    })
    mime: string;

    @ApiProperty({
        required: true,
    })
    extension: string;
}

export class AwsS3PresignPartDto extends AwsS3PresignDto {
    @ApiProperty({
        required: true,
        example: 1,
    })
    partNumber: number;

    @ApiProperty({
        required: true,
        example: 1,
    })
    size: number;
}
