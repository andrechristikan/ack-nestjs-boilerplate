import { registerAs } from '@nestjs/config';

export default registerAs(
    'aws',
    (): Record<string, any> => ({
        s3: {
            credential: {
                key: process.env.AWS_S3_CREDENTIAL_KEY,
                secret: process.env.AWS_S3_CREDENTIAL_SECRET,
            },
            bucket: process.env.AWS_S3_BUCKET ?? 'bucket',
            region: process.env.AWS_S3_REGION,
            baseUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`,
            presignUrlExpired: 30 * 60 * 1000,
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
