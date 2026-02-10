
// Simple Logger Service
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class LoggerService {
  private logs: { level: LogLevel; message: string; timestamp: string; data?: any }[] = [];
  private maxLogs = 100;

  private formatMessage(level: LogLevel, message: string) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  log(messageOrLevel: string, dataOrMessage?: any, data?: any) {
    const validLevels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    let level: LogLevel;
    let message: string;
    let logData: any;

    if (validLevels.includes(messageOrLevel as LogLevel) && typeof dataOrMessage === 'string') {
      // Called as log(level, message, data?)
      level = messageOrLevel as LogLevel;
      message = dataOrMessage;
      logData = data;
    } else {
      // Called as log(message, data?) — shortcut for INFO level
      level = 'INFO';
      message = messageOrLevel;
      logData = dataOrMessage;
    }

    const logEntry = { level, message, timestamp: new Date().toISOString(), data: logData };
    this.logs.unshift(logEntry);

    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Output to console with styling
    const styles = {
      INFO: 'color: #3b82f6; font-weight: bold',
      WARN: 'color: #f59e0b; font-weight: bold',
      ERROR: 'color: #ef4444; font-weight: bold',
      DEBUG: 'color: #9ca3af; font-weight: bold'
    };

    console.log(`%c${level}`, styles[level], message, logData || '');
  }

  info(message: string, data?: any) { this.log('INFO', message, data); }
  warn(message: string, data?: any) { this.log('WARN', message, data); }
  error(message: string, data?: any) { this.log('ERROR', message, data); }
  debug(message: string, data?: any) { this.log('DEBUG', message, data); }

  getLogs() {
    return this.logs;
  }

  clear() {
      this.logs = [];
      console.clear();
      console.log('%cSystem Logs Cleared', 'color: #00B050; font-weight: bold; font-size: 12px;');
  }
}

export const Logger = new LoggerService();
