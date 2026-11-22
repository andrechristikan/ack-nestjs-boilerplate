import { registerAs } from '@nestjs/config';

export interface IConfigEmail {
    noReplyAddress: string | null;
    supportAddress: string | null;
    batchSize: number;
}

export default registerAs('email', (): IConfigEmail => {
    return {
        noReplyAddress:
            process.env.EMAIL_NO_REPLY_ADDRESS === ''
                ? null
                : (process.env.EMAIL_NO_REPLY_ADDRESS ?? null),
        supportAddress:
            process.env.EMAIL_SUPPORT_ADDRESS === ''
                ? null
                : (process.env.EMAIL_SUPPORT_ADDRESS ?? null),
        batchSize: 50,
    };
});
