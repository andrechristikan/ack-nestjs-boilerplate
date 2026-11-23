import { RequestSesIdentityArnRegex } from '@common/request/constants/request.constant';
import { z } from 'zod';

/** @public */
export const RequestSesIdentityArnSchema = z
    .string()
    .regex(RequestSesIdentityArnRegex)
    .meta({
        description: 'AWS SES identity ARN',
        example: 'arn:aws:ses:us-east-1:123456789012:identity/example.com',
    });
