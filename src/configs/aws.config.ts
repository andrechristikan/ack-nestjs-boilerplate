import { registerAs } from '@nestjs/config';
import ms from 'ms';
import { readOptionalEnv } from '@common/request/validations/request.optional-env.validation';

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
    const s3Endpoint = readOptionalEnv(process.env.AWS_S3_ENDPOINT);
    const sesEndpoint = readOptionalEnv(process.env.AWS_SES_ENDPOINT);

    return {
        s3: {
            multipartExpiredInDays: ms('3d') / ms('1d'),
            presignExpiredInSeconds: ms('30m') / 1000,
            corsMaxAgeLongInSeconds: ms('1d') / 1000,
            corsMaxAgeShortInSeconds: ms('1h') / 1000,
            maxAttempts: 3,
            timeoutInMs: ms('30s'),
            region: readOptionalEnv(process.env.AWS_S3_REGION),
            endpoint: s3Endpoint,
            baseUrlPattern: s3Endpoint
                ? '{endpoint}/{bucket}'
                : 'https://{bucket}.s3.{region}.amazonaws.com',
            objectUrlPattern: '{baseUrl}/{key}',
            cdnUrlPattern: '{cdnUrl}/{key}',
            iam: {
                key: readOptionalEnv(process.env.AWS_S3_IAM_CREDENTIAL_KEY),
                secret: readOptionalEnv(
                    process.env.AWS_S3_IAM_CREDENTIAL_SECRET
                ),
                arn: readOptionalEnv(process.env.AWS_S3_IAM_ARN),
            },
            config: {
                public: {
                    bucket: readOptionalEnv(process.env.AWS_S3_PUBLIC_BUCKET),
                    arn: process.env.AWS_S3_PUBLIC_BUCKET
                        ? `arn:aws:s3:::${process.env.AWS_S3_PUBLIC_BUCKET}`
                        : null,
                    cdnUrl: process.env.AWS_S3_PUBLIC_CDN
                        ? `https://${process.env.AWS_S3_PUBLIC_CDN}`
                        : null,
                },
                private: {
                    bucket: readOptionalEnv(process.env.AWS_S3_PRIVATE_BUCKET),
                    arn: process.env.AWS_S3_PRIVATE_BUCKET
                        ? `arn:aws:s3:::${process.env.AWS_S3_PRIVATE_BUCKET}`
                        : null,
                    cdnUrl: process.env.AWS_S3_PRIVATE_CDN
                        ? `https://${process.env.AWS_S3_PRIVATE_CDN}`
                        : null,
                },
            },
        },
        ses: {
            iam: {
                key: readOptionalEnv(process.env.AWS_SES_IAM_CREDENTIAL_KEY),
                secret: readOptionalEnv(
                    process.env.AWS_SES_IAM_CREDENTIAL_SECRET
                ),
            },
            identityArn: readOptionalEnv(process.env.AWS_SES_IDENTITY_ARN),
            region: readOptionalEnv(process.env.AWS_SES_REGION),
            endpoint: sesEndpoint,
        },
    };
});
