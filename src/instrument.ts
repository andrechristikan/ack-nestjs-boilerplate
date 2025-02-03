import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import debugConfigFunction from 'src/configs/debug.config';
import appConfigFunction from 'src/configs/app.config';

const appConfigs = appConfigFunction();
const debugConfigs = debugConfigFunction();

if (debugConfigs.sentry.dsn) {
    Sentry.init({
        dsn: debugConfigs.sentry.dsn,
        debug: false,
        environment: appConfigs.env,
        release: appConfigs.version,
        shutdownTimeout: debugConfigs.sentry.timeout,
        integrations: [nodeProfilingIntegration()],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
    });
}
