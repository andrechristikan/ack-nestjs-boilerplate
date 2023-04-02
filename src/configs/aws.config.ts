import { registerAs } from '@nestjs/config';

export default registerAs(
    'aws',
    (): Record<string, any> => ({
        credential: {
            key: process.env.AWS_CREDENTIAL_KEY,
            secret: process.env.AWS_CREDENTIAL_SECRET,
        },
        s3: {
            bucket: process.env.AWS_S3_BUCKET ?? 'bucket',
            region: process.env.AWS_S3_REGION,
            baseUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`,
        },
    })
);
