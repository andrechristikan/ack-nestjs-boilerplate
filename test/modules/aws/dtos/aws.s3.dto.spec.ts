import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';

describe('aws.s3.dto.ts', () => {
    it('should create a valid AwsS3Dto object', () => {
        const mockAwsS3Dto: AwsS3Dto = {
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

        const dto = plainToInstance(AwsS3Dto, mockAwsS3Dto);

        expect(dto).toBeInstanceOf(AwsS3Dto);
    });
});
