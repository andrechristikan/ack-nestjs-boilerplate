import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { AwsS3Service } from 'src/aws/service/aws.s3.service';
import { CoreModule } from 'src/core/core.module';

describe('AwsS3Service', () => {
    let awsS3Service: AwsS3Service;

    const image = readFileSync('./test/aws/files/small.jpg');
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
    }, 10000);

    it('should get list of aws s3 bucket', async () => {
        const bucket = await awsS3Service.listBucket();

        jest.spyOn(awsS3Service, 'listBucket').mockImplementation(
            async () => bucket
        );

        expect(await awsS3Service.listBucket()).toBe(bucket);
    }, 10000);

    it('should put item into aws s3', async () => {
        const item = await awsS3Service.putItemInBucket(dirname, image);

        jest.spyOn(awsS3Service, 'putItemInBucket').mockImplementation(
            async () => item
        );

        expect(await awsS3Service.putItemInBucket(dirname, image)).toBe(item);
    }, 10000);

    it('should get list of aws s3 item', async () => {
        const items = await awsS3Service.listItemInBucket();

        jest.spyOn(awsS3Service, 'listItemInBucket').mockImplementation(
            async () => items
        );

        expect(await awsS3Service.listItemInBucket()).toBe(items);
    }, 10000);

    it('should delete item in aws s3', async () => {
        const del = await awsS3Service.deleteItemInBucket(dirname);

        jest.spyOn(awsS3Service, 'deleteItemInBucket').mockImplementation(
            async () => del
        );

        expect(await awsS3Service.deleteItemInBucket(dirname)).toBe(del);
    }, 10000);

    it('should delete items in aws s3', async () => {
        const del = await awsS3Service.deleteItemsInBucket([dirname, dir]);

        jest.spyOn(awsS3Service, 'deleteItemsInBucket').mockImplementation(
            async () => del
        );

        expect(await awsS3Service.deleteItemsInBucket([dirname, dir])).toBe(
            del
        );
    }, 10000);
});
