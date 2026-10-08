import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigAws {
    s3: {
        multipartExpiredInDays: number;
        presignExpiredInSeconds: number;
        corsMaxAgeLongInSeconds: number;
        corsMaxAgeShortInSeconds: number;
        maxAttempts: number;
        timeoutInMs: number;
        region: string | null;
        endpoint: string | null;
        baseUrlPattern: string;
        objectUrlPattern: string;
        cdnUrlPattern: string;
        iam: {
            key: string | null;
            secret: string | null;
            arn: string | null;
        };
        config: {
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
    };
    ses: {
        iam: {
            key: string | null;
            secret: string | null;
        };
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
    const publicCdn =
        process.env.AWS_S3_PUBLIC_CDN === ''
            ? null
            : (process.env.AWS_S3_PUBLIC_CDN ?? null);
    const privateBucket =
        process.env.AWS_S3_PRIVATE_BUCKET === ''
            ? null
            : (process.env.AWS_S3_PRIVATE_BUCKET ?? null);
    const privateCdn =
        process.env.AWS_S3_PRIVATE_CDN === ''
            ? null
            : (process.env.AWS_S3_PRIVATE_CDN ?? null);

    return {
        s3: {
            multipartExpiredInDays: ms('3d') / ms('1d'),
            presignExpiredInSeconds: ms('30m') / 1000,
            corsMaxAgeLongInSeconds: ms('1d') / 1000,
            corsMaxAgeShortInSeconds: ms('1h') / 1000,
            maxAttempts: 3,
            timeoutInMs: ms('30s'),
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
            iam: {
                key:
                    process.env.AWS_S3_IAM_CREDENTIAL_KEY === ''
                        ? null
                        : (process.env.AWS_S3_IAM_CREDENTIAL_KEY ?? null),
                secret:
                    process.env.AWS_S3_IAM_CREDENTIAL_SECRET === ''
                        ? null
                        : (process.env.AWS_S3_IAM_CREDENTIAL_SECRET ?? null),
                arn:
                    process.env.AWS_S3_IAM_ARN === ''
                        ? null
                        : (process.env.AWS_S3_IAM_ARN ?? null),
            },
            config: {
                public: {
                    bucket: publicBucket,
                    arn:
                        publicBucket !== null
                            ? `arn:aws:s3:::${publicBucket}`
                            : null,
                    cdnUrl: publicCdn !== null ? `https://${publicCdn}` : null,
                },
                private: {
                    bucket: privateBucket,
                    arn:
                        privateBucket !== null
                            ? `arn:aws:s3:::${privateBucket}`
                            : null,
                    cdnUrl:
                        privateCdn !== null ? `https://${privateCdn}` : null,
                },
            },
        },
        ses: {
            iam: {
                key:
                    process.env.AWS_SES_IAM_CREDENTIAL_KEY === ''
                        ? null
                        : (process.env.AWS_SES_IAM_CREDENTIAL_KEY ?? null),
                secret:
                    process.env.AWS_SES_IAM_CREDENTIAL_SECRET === ''
                        ? null
                        : (process.env.AWS_SES_IAM_CREDENTIAL_SECRET ?? null),
            },
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
