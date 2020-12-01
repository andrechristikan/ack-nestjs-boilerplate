export const LoggerMaxSize = '10m';
export const LoggerMaxFiles = '7d';
export const LoggerName = 'system';

export const HttpLoggerFormat = '\':remote-addr\' --- \':remote-user\' --- \'[:date[iso]]\' --- \'HTTP/:http-version\' --- \'[:status]\' --- \':method\' --- \':url\' --- \'Request Header :: :req-headers\' --- \'Request Params :: :req-params\' --- \'Request Body :: :req-body\' --- \'Response Header :: :res[header]\' --- \'Response Body :: :res-body\' --- \':response-time ms\' --- \':referrer\' --- \':user-agent\'';
export const HttpLoggerSize = '10M';
export const HttpLoggerMaxSize = '20M';
export const HttpLoggerName = 'http';
