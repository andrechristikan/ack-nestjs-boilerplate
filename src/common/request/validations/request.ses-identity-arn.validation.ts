import { z } from 'zod';

/**
 * SES identity ARN: `arn:aws[-partition]:ses:<region>:<12-digit account>:identity/<domain or address>`.
 */
export const RequestSesIdentityArnSchema = z
    .string()
    .regex(/^arn:aws[a-z-]*:ses:[a-z0-9-]+:\d{12}:identity\/.+$/)
    .meta({
        description: 'AWS SES identity ARN',
        example: 'arn:aws:ses:us-east-1:123456789012:identity/example.com',
    });
