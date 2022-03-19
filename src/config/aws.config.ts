import { registerAs } from '@nestjs/config';

export default registerAs(
    'aws',
    (): Record<string, any> => ({
        bucketCreate: process.env.AWS_BUCKET_CREATE === 'true' || false,
        credential: {
            key: process.env.AWS_CREDENTIAL_KEY,
            secret: process.env.AWS_CREDENTIAL_SECRET,
        },
        s3: {
            bucket: process.env.AWS_S3_BUCKET || 'acks3',
            region: process.env.AWS_S3_REGION,
            baseUrl:
                process.env.AWS_S3_BASE_URL ||
                `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`,
        },
    })
);
