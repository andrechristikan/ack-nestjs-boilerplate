import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import debugConfigFunction from 'src/configs/debug.config';
import appConfigFunction from 'src/configs/app.config';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { LOGGER_EXCLUDED_ROUTES } from 'src/common/logger/constants/logger.constant';

const appConfigs = appConfigFunction();
const debugConfigs = debugConfigFunction();
const helperStringService = new HelperStringService();

if (debugConfigs.sentry.dsn) {
    Sentry.init({
        dsn: debugConfigs.sentry.dsn,
        debug: false,
        environment: appConfigs.env,
        release: appConfigs.version,
        integrations: [nodeProfilingIntegration()],
        tracesSampleRate:
            appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION ? 0.3 : 1.0,
        profilesSampleRate:
            appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION ? 0.1 : 0.5,
        normalizeDepth: 3,
        maxValueLength: 1000,
        attachStacktrace: false,
        sendDefaultPii: false,
        maxBreadcrumbs: 30,
        beforeSend(event) {
            if (event.exception?.values) {
                const exception = event.exception.values[0];
                const isWorkerException = exception?.type === 'WorkerException';

                if (
                    isWorkerException &&
                    exception.mechanism?.data?.fatal === false
                ) {
                    // Don't send non-fatal WorkerExceptions to Sentry
                    return null;
                }
            }

            if (event.request) {
                // Filter out excluded routes
                const url = event.request.url;

                if (
                    helperStringService.checkWildcardUrl(
                        url,
                        LOGGER_EXCLUDED_ROUTES
                    )
                ) {
                    return null;
                }
            }

            if (event.request && event.contexts && event.contexts.response) {
                const statusCode = event.contexts.response.status_code;
                // Only send events for errors (5xx status codes)
                if (statusCode && statusCode < 500) {
                    return null;
                }
            }

            if (event.level === 'info' || event.level === 'debug') {
                // Don't send info and debug level events
                return null;
            }

            return event;
        },
        tracesSampler: samplingContext => {
            const transaction = samplingContext?.transactionContext;

            if (
                appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION &&
                transaction?.data?.status === 'ok'
            ) {
                // Only sample 5% of successful transactions
                return 0.05;
            }

            // Use normal sampling rate for errors or non-production
            return appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION
                ? 0.3
                : 1.0;
        },
    });
}
