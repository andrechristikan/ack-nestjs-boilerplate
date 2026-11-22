import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import type { LogSeverityLevel } from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import appConfigFunction from '@configs/app.config';
import loggerConfigFunction from '@configs/logger.config';
import sentryConfigFunction from '@configs/sentry.config';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { LoggerHttpMethodPrefixRegex } from '@common/logger/constants/logger.constant';
import { LoggerUrlUtil } from '@common/logger/utils/logger.url.util';
import { SentryUtil } from '@common/sentry/utils/sentry.util';
import { QueueException } from '@common/queue/exceptions/queue.exception';

const appConfigs = appConfigFunction();
const loggerConfigs = loggerConfigFunction();
const sentryConfigs = sentryConfigFunction();
const loggerUrlUtil = new LoggerUrlUtil();
const sentryUtil = new SentryUtil(loggerUrlUtil);

const sentryLogLevels: LogSeverityLevel[] =
    appConfigs.env === EnumAppEnvironment.production
        ? ['warn', 'error', 'fatal']
        : ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

if (sentryConfigs.dsn) {
    Sentry.init({
        dsn: sentryConfigs.dsn,
        debug: false,
        environment: appConfigs.env,
        release: appConfigs.version,
        enableLogs: true,
        integrations: [
            nodeProfilingIntegration(),
            Sentry.pinoIntegration({ log: { levels: sentryLogLevels } }),
        ],
        tracesSampleRate: sentryConfigs.tracesSampleRate,
        profilesSampleRate: sentryConfigs.profilesSampleRate,
        normalizeDepth: sentryConfigs.normalizeDepth,
        maxValueLength: sentryConfigs.maxValueLength,
        attachStacktrace: true,
        sendDefaultPii: false,
        maxBreadcrumbs: sentryConfigs.maxBreadcrumbs,
        beforeSend(event, hint) {
            const originalException = hint?.originalException;
            if (
                originalException instanceof QueueException &&
                !originalException.isFatal
            ) {
                return null;
            }

            if (event.request) {
                const url = event.request.url ?? '';

                if (
                    loggerUrlUtil.matchesPatterns(
                        url,
                        loggerConfigs.excludedRoutes
                    )
                ) {
                    return null;
                }
            }

            if (event.request && event.contexts && event.contexts.response) {
                const statusCode = event.contexts.response.status_code;
                if (statusCode && statusCode < 500) {
                    return null;
                }
            }

            if (event.level === 'info' || event.level === 'debug') {
                return null;
            }

            return sentryUtil.scrubEvent(event);
        },
        beforeSendTransaction(event) {
            return sentryUtil.scrubEvent(event);
        },
        beforeBreadcrumb(breadcrumb) {
            return sentryUtil.scrubBreadcrumb(breadcrumb);
        },
        beforeSendLog(log) {
            return sentryUtil.scrubLog(log);
        },
        tracesSampler: samplingContext => {
            if (
                loggerUrlUtil.matchesPatterns(
                    samplingContext.normalizedRequest?.url ?? '',
                    loggerConfigs.excludedRoutes
                ) ||
                loggerUrlUtil.matchesPatterns(
                    samplingContext.name.replace(
                        LoggerHttpMethodPrefixRegex,
                        ''
                    ),
                    loggerConfigs.excludedRoutes
                )
            ) {
                return 0;
            }

            return sentryConfigs.tracesSampleRate;
        },
    });
}
