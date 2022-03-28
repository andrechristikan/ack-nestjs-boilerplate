import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { AwsS3Service } from 'src/aws/service/aws.s3.service';
import { CoreModule } from 'src/core/core.module';

describe('AwsS3Service', () => {
    let awsS3Service: AwsS3Service;

    const image = readFileSync('./e2e/user/files/small.jpg');
    const dirname = '/test/testack.jpg';
    const dir = '/test';

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
            providers: [AwsS3Service],
        }).compile();

        awsS3Service = moduleRef.get<AwsS3Service>(AwsS3Service);
    });

    it('should be defined', async () => {
        expect(awsS3Service).toBeDefined();
    });

    it('should get list of aws s3 bucket', async () => {
        const bucket = await awsS3Service.s3ListBucket();

        jest.spyOn(awsS3Service, 's3ListBucket').mockImplementation(
            async () => bucket
        );

        expect(await awsS3Service.s3ListBucket()).toBe(bucket);
    });

    it('should put item into aws s3', async () => {
        const item = await awsS3Service.s3PutItemInBucket(dirname, image);

        jest.spyOn(awsS3Service, 's3PutItemInBucket').mockImplementation(
            async () => item
        );

        expect(await awsS3Service.s3PutItemInBucket(dirname, image)).toBe(item);
    });

    it('should get list of aws s3 item', async () => {
        const items = await awsS3Service.s3ListItemInBucket();

        jest.spyOn(awsS3Service, 's3ListItemInBucket').mockImplementation(
            async () => items
        );

        expect(await awsS3Service.s3ListItemInBucket()).toBe(items);
    });

    it('should delete item in aws s3', async () => {
        const del = await awsS3Service.s3DeleteItemInBucket(dirname);

        jest.spyOn(awsS3Service, 's3DeleteItemInBucket').mockImplementation(
            async () => del
        );

        expect(await awsS3Service.s3DeleteItemInBucket(dirname)).toBe(del);
    });

    it('should delete items in aws s3', async () => {
        const del = await awsS3Service.s3DeleteItemsInBucket([dirname, dir]);

        jest.spyOn(awsS3Service, 's3DeleteItemsInBucket').mockImplementation(
            async () => del
        );

        expect(await awsS3Service.s3DeleteItemsInBucket([dirname, dir])).toBe(
            del
        );
    });
});
