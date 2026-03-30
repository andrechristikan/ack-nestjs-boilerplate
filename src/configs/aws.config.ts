import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigAws {
    s3: {
        multipartExpiredInDay: number;
        presignExpired: number;
        maxAttempts: number;
        timeoutInMs: number;
        region?: string;
        iam: {
            key?: string;
            secret?: string;
            arn?: string;
        };
        config: {
            public: {
                bucket?: string;
                arn?: string;
                baseUrl?: string;
                cdnUrl?: string;
            };
            private: {
                bucket?: string;
                arn?: string;
                baseUrl?: string;
                cdnUrl?: string;
            };
        };
    };
    ses: {
        iam: {
            key?: string;
            secret?: string;
            arn?: string;
        };
        region?: string;
    };
}

export default registerAs(
    'aws',
    (): IConfigAws => ({
        s3: {
            multipartExpiredInDay: 3,
            presignExpired: 30 * 60,
            maxAttempts: 3,
            timeoutInMs: ms('30s'),
            region: process.env.AWS_S3_REGION,
            iam: {
                key: process.env.AWS_S3_IAM_CREDENTIAL_KEY,
                secret: process.env.AWS_S3_IAM_CREDENTIAL_SECRET,
                arn: process.env.AWS_S3_IAM_ARN,
            },
            config: {
                public: {
                    bucket: process.env.AWS_S3_PUBLIC_BUCKET,
                    baseUrl:
                        process.env.AWS_S3_PUBLIC_BUCKET &&
                        process.env.AWS_S3_REGION
                            ? `https://${process.env.AWS_S3_PUBLIC_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`
                            : undefined,
                    arn: process.env.AWS_S3_PUBLIC_BUCKET
                        ? `arn:aws:s3:::${process.env.AWS_S3_PUBLIC_BUCKET}`
                        : undefined,
                    cdnUrl: process.env.AWS_S3_PUBLIC_CDN
                        ? `https://${process.env.AWS_S3_PUBLIC_CDN}`
                        : undefined,
                },
                private: {
                    bucket: process.env.AWS_S3_PRIVATE_BUCKET,
                    baseUrl:
                        process.env.AWS_S3_PRIVATE_BUCKET &&
                        process.env.AWS_S3_PRIVATE_REGION
                            ? `https://${process.env.AWS_S3_PRIVATE_BUCKET}.s3.${process.env.AWS_S3_PRIVATE_REGION}.amazonaws.com`
                            : undefined,
                    arn: process.env.AWS_S3_PRIVATE_BUCKET
                        ? `arn:aws:s3:::${process.env.AWS_S3_PRIVATE_BUCKET}`
                        : undefined,
                    cdnUrl: process.env.AWS_S3_PRIVATE_REGION
                        ? `https://${process.env.AWS_S3_PRIVATE_REGION}`
                        : undefined,
                },
            },
        },
        ses: {
            iam: {
                key: process.env.AWS_SES_IAM_CREDENTIAL_KEY,
                secret: process.env.AWS_SES_IAM_CREDENTIAL_SECRET,
                arn: process.env.AWS_SES_IAM_ARN,
            },
            region: process.env.AWS_SES_REGION,
        },
    })
);
