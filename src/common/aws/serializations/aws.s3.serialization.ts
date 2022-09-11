import { Type } from 'class-transformer';

export class AwsS3Serialization {
    @Type(() => String)
    path: string;

    @Type(() => String)
    pathWithFilename: string;

    @Type(() => String)
    filename: string;

    @Type(() => String)
    completedUrl: string;

    @Type(() => String)
    baseUrl: string;

    @Type(() => String)
    mime: string;
}
