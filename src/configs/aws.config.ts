import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigAws {
    s3: {
        multipartExpiredInDay: number;
        presignExpiredInSeconds: number;
        maxAttempts: number;
        timeoutInMs: number;
        region: string | null;
        iam: {
            key: string | null;
            secret: string | null;
            arn: string | null;
        };
        config: {
            public: {
                bucket: string | null;
                arn: string | null;
                baseUrl: string | null;
                cdnUrl: string | null;
            };
            private: {
                bucket: string | null;
                arn: string | null;
                baseUrl: string | null;
                cdnUrl: string | null;
            };
        };
    };
    ses: {
        iam: {
            key: string | null;
            secret: string | null;
            arn: string | null;
        };
        region: string | null;
    };
}

export default registerAs(
    'aws',
    (): IConfigAws => ({
        s3: {
            multipartExpiredInDay: 3,
            presignExpiredInSeconds: 30 * 60,
            maxAttempts: 3,
            timeoutInMs: ms('30s'),
            region: process.env.AWS_S3_REGION ?? null,
            iam: {
                key: process.env.AWS_S3_IAM_CREDENTIAL_KEY ?? null,
                secret: process.env.AWS_S3_IAM_CREDENTIAL_SECRET ?? null,
                arn: process.env.AWS_S3_IAM_ARN ?? null,
            },
            config: {
                public: {
                    bucket: process.env.AWS_S3_PUBLIC_BUCKET ?? null,
                    baseUrl:
                        process.env.AWS_S3_PUBLIC_BUCKET &&
                        process.env.AWS_S3_REGION
                            ? `https://${process.env.AWS_S3_PUBLIC_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`
                            : null,
                    arn: process.env.AWS_S3_PUBLIC_BUCKET
                        ? `arn:aws:s3:::${process.env.AWS_S3_PUBLIC_BUCKET}`
                        : null,
                    cdnUrl: process.env.AWS_S3_PUBLIC_CDN
                        ? `https://${process.env.AWS_S3_PUBLIC_CDN}`
                        : null,
                },
                private: {
                    bucket: process.env.AWS_S3_PRIVATE_BUCKET ?? null,
                    baseUrl:
                        process.env.AWS_S3_PRIVATE_BUCKET &&
                        process.env.AWS_S3_REGION
                            ? `https://${process.env.AWS_S3_PRIVATE_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`
                            : null,
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
                key: process.env.AWS_SES_IAM_CREDENTIAL_KEY ?? null,
                secret: process.env.AWS_SES_IAM_CREDENTIAL_SECRET ?? null,
                arn: process.env.AWS_SES_IAM_ARN ?? null,
            },
            region: process.env.AWS_SES_REGION ?? null,
        },
    })
);
