export default (): Record<string, any> => ({
    aws: {
        credential: {
            key: process.env.AWS_CREDENTIAL_KEY,
            secret: process.env.AWS_CREDENTIAL_SECRET
        },
        s3: {
            bucket: process.env.AWS_S3_BUCKET || 'default',
            region: process.env.AWS_S3_REGION,
            baseUrl:
                process.env.AWS_S3_BASE_URL ||
                `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`
        }
    }
});
