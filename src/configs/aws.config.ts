import { registerAs } from '@nestjs/config';

export interface IConfigAws {
    s3: {
        presignExpired: number;
        region?: string;
        credential: {
            key?: string;
            secret?: string;
        };
        config: {
            public: {
                bucket?: string;
                baseUrl?: string;
                cdnUrl?: string;
            };
            private: {
                bucket?: string;
                baseUrl?: string;
                cdnUrl?: string;
            };
        };
    };
    ses: {
        credential: {
            key?: string;
            secret?: string;
        };
        region: string;
    };
}

export default registerAs(
    'aws',
    (): IConfigAws => ({
        s3: {
            presignExpired: 30 * 60, // 30 mins
            region: process.env.AWS_S3_REGION,
            credential: {
                key: process.env.AWS_S3_CREDENTIAL_KEY,
                secret: process.env.AWS_S3_CREDENTIAL_SECRET,
            },
            config: {
                public: {
                    bucket: process.env.AWS_S3_PUBLIC_BUCKET ?? 'bucketPublic',
                    baseUrl: `https://${process.env.AWS_S3_PUBLIC_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`,
                    cdnUrl: process.env.AWS_S3_PUBLIC_CDN
                        ? `https://${process.env.AWS_S3_PUBLIC_CDN}`
                        : undefined,
                },
                private: {
                    bucket:
                        process.env.AWS_S3_PRIVATE_BUCKET ?? 'bucketPrivate',
                    baseUrl: `https://${process.env.AWS_S3_PRIVATE_BUCKET}.s3.${process.env.AWS_S3_PRIVATE_REGION}.amazonaws.com`,
                    cdnUrl: process.env.AWS_S3_PRIVATE_REGION
                        ? `https://${process.env.AWS_S3_PRIVATE_REGION}`
                        : undefined,
                },
            },
        },
        ses: {
            credential: {
                key: process.env.AWS_SES_CREDENTIAL_KEY,
                secret: process.env.AWS_SES_CREDENTIAL_SECRET,
            },
            region: process.env.AWS_SES_REGION,
        },
    })
);
