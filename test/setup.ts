import { ConsoleLogger, Logger } from '@nestjs/common';

const silent = (): undefined => undefined;

Logger.overrideLogger(false);

Logger.prototype.log = silent;
Logger.prototype.error = silent;
Logger.prototype.warn = silent;
Logger.prototype.debug = silent;
Logger.prototype.verbose = silent;
Logger.prototype.fatal = silent;

Logger.log = silent;
Logger.error = silent;
Logger.warn = silent;
Logger.debug = silent;
Logger.verbose = silent;
Logger.fatal = silent;

ConsoleLogger.prototype.log = silent;
ConsoleLogger.prototype.error = silent;
ConsoleLogger.prototype.warn = silent;
ConsoleLogger.prototype.debug = silent;
ConsoleLogger.prototype.verbose = silent;
ConsoleLogger.prototype.fatal = silent;
