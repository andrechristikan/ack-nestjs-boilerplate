import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigAws {
    s3: {
        multipartExpiresInDays: number;
        presignExpiresInSeconds: number;
        corsMaxAgeLongInSeconds: number;
        corsMaxAgeShortInSeconds: number;
        maxAttempts: number;
        timeoutInMs: number;
        deleteDirMaxIterations: number;
        listMaxKeys: number;
        region: string | null;
        endpoint: string | null;
        baseUrlPattern: string;
        objectUrlPattern: string;
        cdnUrlPattern: string;
        accessKeyId: string | null;
        secretAccessKey: string | null;
        iamPrincipalArn: string | null;
        public: {
            bucket: string | null;
            arn: string | null;
            cdnUrl: string | null;
        };
        private: {
            bucket: string | null;
            arn: string | null;
            cdnUrl: string | null;
        };
    };
    ses: {
        accessKeyId: string | null;
        secretAccessKey: string | null;
        identityArn: string | null;
        region: string | null;
        endpoint: string | null;
    };
}

export default registerAs('aws', (): IConfigAws => {
    const s3Endpoint =
        process.env.AWS_S3_ENDPOINT === ''
            ? null
            : (process.env.AWS_S3_ENDPOINT ?? null);
    const publicBucket =
        process.env.AWS_S3_PUBLIC_BUCKET === ''
            ? null
            : (process.env.AWS_S3_PUBLIC_BUCKET ?? null);
    const publicCdnUrl =
        process.env.AWS_S3_PUBLIC_CDN_URL === ''
            ? null
            : (process.env.AWS_S3_PUBLIC_CDN_URL ?? null);
    const privateBucket =
        process.env.AWS_S3_PRIVATE_BUCKET === ''
            ? null
            : (process.env.AWS_S3_PRIVATE_BUCKET ?? null);
    const privateCdnUrl =
        process.env.AWS_S3_PRIVATE_CDN_URL === ''
            ? null
            : (process.env.AWS_S3_PRIVATE_CDN_URL ?? null);

    return {
        s3: {
            multipartExpiresInDays: ms('3d') / ms('1d'),
            presignExpiresInSeconds: ms('30m') / 1000,
            corsMaxAgeLongInSeconds: ms('1d') / 1000,
            corsMaxAgeShortInSeconds: ms('1h') / 1000,
            maxAttempts: 3,
            timeoutInMs: ms('30s'),
            deleteDirMaxIterations: 100,
            listMaxKeys: 100,
            region:
                process.env.AWS_S3_REGION === ''
                    ? null
                    : (process.env.AWS_S3_REGION ?? null),
            endpoint: s3Endpoint,
            baseUrlPattern: s3Endpoint
                ? '{endpoint}/{bucket}'
                : 'https://{bucket}.s3.{region}.amazonaws.com',
            objectUrlPattern: '{baseUrl}/{key}',
            cdnUrlPattern: '{cdnUrl}/{key}',
            accessKeyId:
                process.env.AWS_S3_ACCESS_KEY_ID === ''
                    ? null
                    : (process.env.AWS_S3_ACCESS_KEY_ID ?? null),
            secretAccessKey:
                process.env.AWS_S3_SECRET_ACCESS_KEY === ''
                    ? null
                    : (process.env.AWS_S3_SECRET_ACCESS_KEY ?? null),
            iamPrincipalArn:
                process.env.AWS_S3_IAM_PRINCIPAL_ARN === ''
                    ? null
                    : (process.env.AWS_S3_IAM_PRINCIPAL_ARN ?? null),
            public: {
                bucket: publicBucket,
                arn:
                    publicBucket !== null
                        ? `arn:aws:s3:::${publicBucket}`
                        : null,
                cdnUrl: publicCdnUrl,
            },
            private: {
                bucket: privateBucket,
                arn:
                    privateBucket !== null
                        ? `arn:aws:s3:::${privateBucket}`
                        : null,
                cdnUrl: privateCdnUrl,
            },
        },
        ses: {
            accessKeyId:
                process.env.AWS_SES_ACCESS_KEY_ID === ''
                    ? null
                    : (process.env.AWS_SES_ACCESS_KEY_ID ?? null),
            secretAccessKey:
                process.env.AWS_SES_SECRET_ACCESS_KEY === ''
                    ? null
                    : (process.env.AWS_SES_SECRET_ACCESS_KEY ?? null),
            identityArn:
                process.env.AWS_SES_IDENTITY_ARN === ''
                    ? null
                    : (process.env.AWS_SES_IDENTITY_ARN ?? null),
            region:
                process.env.AWS_SES_REGION === ''
                    ? null
                    : (process.env.AWS_SES_REGION ?? null),
            endpoint:
                process.env.AWS_SES_ENDPOINT === ''
                    ? null
                    : (process.env.AWS_SES_ENDPOINT ?? null),
        },
    };
});
