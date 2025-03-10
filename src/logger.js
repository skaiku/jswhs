/**
 * Logger class for consistent logging throughout the application
 */
export class Logger {
  // Log levels with numeric values for comparison
  static LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4
  };

  // Current log level
  static currentLevel = 'info';

  /**
   * Set the current log level
   * @param {string} level - Log level (debug, info, warn, error, none)
   */
  static setLevel(level) {
    if (this.LOG_LEVELS[level] !== undefined) {
      this.currentLevel = level;
      this.info(`Log level set to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}. Using default: info`);
      this.currentLevel = 'info';
    }
  }

  /**
   * Check if a log level should be displayed
   * @param {string} level - Log level to check
   * @returns {boolean} Whether the log should be displayed
   */
  static shouldLog(level) {
    return this.LOG_LEVELS[level] >= this.LOG_LEVELS[this.currentLevel];
  }

  /**
   * Format a log message with timestamp
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any[]} args - Additional arguments
   * @returns {string} Formatted log message
   */
  static formatLog(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(5);
    return `[${timestamp}] [${levelUpper}] ${message}`;
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  static debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatLog('debug', message), ...args);
    }
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  static info(message, ...args) {
    if (this.shouldLog('info')) {
      console.info(this.formatLog('info', message), ...args);
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  static warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message), ...args);
    }
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  static error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message), ...args);
    }
  }

  /**
   * Create a section header in the log
   * @param {string} title - Section title
   */
  static section(title) {
    if (this.shouldLog('info')) {
      const line = '='.repeat(50);
      console.info(`\n${line}\n${title}\n${line}`);
    }
  }

  /**
   * Log the start of a task and return a function to log its completion
   * @param {string} taskName - Name of the task
   * @returns {Function} Function to call when task is complete
   */
  static task(taskName) {
    if (!this.shouldLog('debug')) return () => {};
    
    const startTime = performance.now();
    console.debug(this.formatLog('debug', `🔄 Starting: ${taskName}`));
    
    return (status = 'completed') => {
      const duration = (performance.now() - startTime).toFixed(2);
      console.debug(this.formatLog('debug', `✅ ${status}: ${taskName} (${duration}ms)`));
    };
  }
} 