import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { AwsS3PresignUrlDto } from 'src/modules/aws/dtos/aws.s3-presign-url.dto';

describe('aws.s3.dto.ts', () => {
    it('should create a valid AwsS3Dto object', () => {
        const mockAwsS3PresignUrlDto: AwsS3PresignUrlDto = {
            bucket: faker.string.alpha(10),
            path: faker.string.alpha(15),
            pathWithFilename: faker.string.alpha(20),
            filename: faker.string.alpha(10),
            completedUrl: faker.string.alpha(10),
            baseUrl: faker.string.alpha(10),
            mime: faker.string.alpha(10),
            duration: faker.number.int({ max: 10 }),
            size: faker.number.int({ max: 10 }),
            expiredIn: faker.number.int({ max: 10 }),
        };

        const dto = plainToInstance(AwsS3PresignUrlDto, mockAwsS3PresignUrlDto);

        expect(dto).toBeInstanceOf(AwsS3PresignUrlDto);
    });
});
