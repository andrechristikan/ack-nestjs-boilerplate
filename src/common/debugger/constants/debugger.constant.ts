export const DEBUGGER_NAME = 'system';

export const DEBUGGER_HTTP_FORMAT =
    "':remote-addr' - ':remote-user' - '[:date[iso]]' - 'HTTP/:http-version' - '[:status]' - ':method' - ':url' - 'Request Header :: :req-headers' - 'Request Params :: :req-params' - 'Request Body :: :req-body' - 'Response Header :: :res[header]' - 'Response Body :: :res-body' - ':response-time ms' - ':referrer' - ':user-agent'";
export const DEBUGGER_HTTP_NAME = 'http';
