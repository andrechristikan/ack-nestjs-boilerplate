import { registerAs } from '@nestjs/config';

export default registerAs(
    'verification',
    (): Record<string, any> => ({
        expiredInMinutes: 5,
        otpLength: 6,
        reference: {
            prefix: 'VER',
            length: 10,
        },
    })
);
