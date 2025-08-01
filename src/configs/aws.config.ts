import { registerAs } from '@nestjs/config';

export default registerAs(
    'aws',
    (): Record<string, any> => ({
        s3: {
            presignExpired: 30 * 60, // 30 mins
            credential: {
                key: process.env.AWS_S3_CREDENTIAL_KEY,
                secret: process.env.AWS_S3_CREDENTIAL_SECRET,
            },
            region: process.env.AWS_S3_REGION,
            public: {
                bucket: process.env.AWS_S3_PUBLIC_BUCKET,
                baseUrl: `https://${process.env.AWS_S3_PUBLIC_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`,
                cdnUrl: process.env.AWS_S3_PUBLIC_CDN
                    ? `https://${process.env.AWS_S3_PUBLIC_CDN}`
                    : undefined,
            },
            private: {
                bucket: process.env.AWS_S3_PRIVATE_BUCKET ?? 'bucketPrivate',
                baseUrl: `https://${process.env.AWS_S3_PRIVATE_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`,
                cdnUrl: process.env.AWS_S3_PRIVATE_CDN
                    ? `https://${process.env.AWS_S3_PRIVATE_CDN}`
                    : undefined,
            },
        },
        ses: {
            credential: {
                key: process.env.AWS_SES_CREDENTIAL_KEY,
                secret: process.env.AWS_SES_CREDENTIAL_SECRET,
            },
            region: process.env.AWS_SES_REGION,
        },
        pinpoint: {
            credential: {
                key: process.env.AWS_PINPOINT_CREDENTIAL_KEY,
                secret: process.env.AWS_PINPOINT_CREDENTIAL_SECRET,
            },
            region: process.env.AWS_PINPOINT_REGION,
            applicationId: process.env.AWS_PINPOINT_APPLICATION_ID,
        },
    })
);
