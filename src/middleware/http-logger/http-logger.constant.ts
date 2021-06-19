export const LOGGER_HTTP_FORMAT =
    "':remote-addr' - ':remote-user' - '[:date[iso]]' - 'HTTP/:http-version' - '[:status]' - ':method' - ':url' - 'Request Header :: :req-headers' - 'Request Params :: :req-params' - 'Request Body :: :req-body' - 'Response Header :: :res[header]' - 'Response Body :: :res-body' - ':response-time ms' - ':referrer' - ':user-agent'";
export const LOGGER_HTTP_SIZE = '10M';
export const LOGGER_HTTP_MAX_SIZE = '20M';
export const LOGGER_HTTP_NAME = 'http';
export const LOGGER_HTTP = false;
