import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from 'src/modules/aws/dtos/aws.s3-multipart.dto';
import { AwsS3PresignDto } from 'src/modules/aws/dtos/aws.s3-presign.dto';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import {
    IAwsS3ItemsOptions,
    IAwsS3Options,
    IAwsS3Presign,
    IAwsS3PresignOptions,
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
    IAwsS3PutItemWithAclOptions,
} from 'src/modules/aws/interfaces/aws.interface';

export interface IAwsS3Service {
    checkItem(key: string, options?: IAwsS3Options): Promise<AwsS3Dto>;
    getItems(options?: IAwsS3ItemsOptions): Promise<AwsS3Dto[]>;
    getItem(key: string, options?: IAwsS3Options): Promise<AwsS3Dto>;
    putItem(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3Dto>;
    putItemWithAcl(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3Dto>;
    deleteItem(key: string, options?: IAwsS3Options): Promise<void>;
    deleteItems(keys: string[], options?: IAwsS3Options): Promise<void>;
    createMultiPart(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3MultipartDto>;
    createMultiPartWithAcl(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3MultipartDto>;
    putItemMultiPart(
        multipart: AwsS3MultipartDto,
        partNumber: number,
        file: Buffer,
        options?: IAwsS3Options
    ): Promise<AwsS3MultipartDto>;
    updateMultiPart(
        { size, parts, ...others }: AwsS3MultipartDto,
        part: AwsS3MultipartPartDto
    ): AwsS3MultipartDto;
    completeMultipart(
        multipart: AwsS3MultipartDto,
        options?: IAwsS3Options
    ): Promise<void>;
    abortMultipart(
        multipart: AwsS3MultipartDto,
        options?: IAwsS3Options
    ): Promise<void>;
    presign(
        { filename, size, duration }: IAwsS3Presign,
        options?: IAwsS3PresignOptions
    ): Promise<AwsS3PresignDto>;
    getAssetPath(): string;
}
