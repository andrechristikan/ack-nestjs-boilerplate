export const LoggerMaxSize = '10m';
export const LoggerMaxFiles = '7d';
export const LoggerName = 'system';

export const HttpLoggerFormat =
    ':remote-addr - :remote-user [:date[iso]] - HTTP/:http-version [:status] :res[content-length]/:response-time ms ":referrer" ":user-agent" ":method :url" - Request :req[header] Params[:req-params] Body[:req-body]  - Response :res[header] Body[:res-body]';
export const HttpLoggerSize = '10M';
export const HttpLoggerMaxSize = '20M';
export const HttpLoggerName = 'http';
