import { registerAs } from '@nestjs/config';

export interface IConfigSentry {
    dsn: string | null;
    tracesSampleRate: number;
    profilesSampleRate: number;
    maxBreadcrumbs: number;
    normalizeDepth: number;
    maxValueLength: number;
}

export default registerAs('sentry', (): IConfigSentry => {
    return {
        dsn:
            process.env.SENTRY_DSN === ''
                ? null
                : (process.env.SENTRY_DSN ?? null),
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE!),
        profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE!),
        maxBreadcrumbs: 30,
        normalizeDepth: 3,
        maxValueLength: 1000,
    };
});
