import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from 'src/modules/aws/dtos/aws.s3-multipart.dto';

describe('aws.s3-multipart.dto.ts', () => {
    it('should create a valid AwsS3MultipartPartDto object', () => {
        const mockAwsS3MultipartPartDto: AwsS3MultipartPartDto = {
            eTag: faker.string.alpha(10),
            partNumber: faker.number.int(10),
            size: faker.number.int(10),
        };

        const dto = plainToInstance(
            AwsS3MultipartPartDto,
            mockAwsS3MultipartPartDto
        );

        expect(dto).toBeInstanceOf(AwsS3MultipartPartDto);
    });

    it('should create a valid AwsS3MultipartDto object', () => {
        const mock: AwsS3MultipartDto = {
            uploadId: faker.string.uuid(),
            lastPartNumber: faker.number.int(10),
            maxPartNumber: faker.number.int(10),
            parts: [] as AwsS3MultipartPartDto[],
            bucket: faker.string.alpha(10),
            path: faker.string.alpha(15),
            pathWithFilename: faker.string.alpha(20),
            filename: faker.string.alpha(10),
            completedUrl: faker.string.alpha(10),
            baseUrl: faker.string.alpha(10),
            mime: faker.string.alpha(10),
            duration: faker.number.int(10),
            size: faker.number.int(10),
        };

        const dto = plainToInstance(AwsS3MultipartDto, mock);

        expect(dto).toBeInstanceOf(AwsS3MultipartDto);
    });
});
