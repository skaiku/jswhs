import fetch from 'node-fetch';
import { Logger } from './logger.js';

/**
 * Class to send notifications about domain expiration
 */
export class Notifier {
  /**
   * @param {import('./interfaces.js').NtfyConfig} ntfyConfig - Configuration for ntfy.sh
   */
  constructor(ntfyConfig) {
    this.ntfyUrl = ntfyConfig.url;
    this.priority = ntfyConfig.priority;
    this.auth = ntfyConfig.auth;
    Logger.debug(`Notifier initialized with URL: ${this.ntfyUrl}, priority: ${this.priority}`);
  }

  /**
   * Get appropriate emoji based on days until expiration
   * @param {number} daysUntilExpiration - Days until domain expires
   * @returns {string} Emoji representing urgency
   */
  getExpirationEmoji(daysUntilExpiration) {
    if (daysUntilExpiration <= 7) return '🚨'; // Critical
    if (daysUntilExpiration <= 14) return '⚠️'; // Warning
    if (daysUntilExpiration <= 30) return '⏰'; // Alert
    return '📅'; // Calendar
  }

  /**
   * Create notification title
   * @param {import('./interfaces.js').DomainStatus} domainInfo - Domain status information
   * @returns {string} Formatted notification title
   */
  createTitle(domainInfo) {
    const emoji = this.getExpirationEmoji(domainInfo.daysUntilExpiration);
    return `${emoji} Domain Expiration: ${domainInfo.domain}`;
  }

  /**
   * Create notification message
   * @param {import('./interfaces.js').DomainStatus} domainInfo - Domain status information
   * @returns {string} Formatted notification message
   */
  createMessage(domainInfo) {
    const expirationDate = new Date(domainInfo.expirationDate).toISOString().split('T')[0];
    let urgencyText = '';
    
    if (domainInfo.daysUntilExpiration <= 7) {
      urgencyText = '🔴 CRITICAL: Immediate action required!';
    } else if (domainInfo.daysUntilExpiration <= 14) {
      urgencyText = '🟠 URGENT: Please renew soon!';
    } else if (domainInfo.daysUntilExpiration <= 30) {
      urgencyText = '🟡 ATTENTION: Renewal needed this month';
    }
    
    let message = `Domain: ${domainInfo.domain}\n`;
    message += `Description: ${domainInfo.description || 'N/A'}\n`;
    message += `Expires: ${expirationDate}\n`;
    message += `Days remaining: ${domainInfo.daysUntilExpiration}\n`;
    
    if (urgencyText) {
      message += `\n${urgencyText}`;
    }
    
    return message;
  }

  /**
   * Send a notification about domain expiration
   * @param {import('./interfaces.js').DomainStatus} domainInfo - Domain status information
   * @returns {Promise<Object>} Result of the notification attempt
   */
  async sendNotification(domainInfo) {
    const done = Logger.task(`Send notification for ${domainInfo.domain}`);
    const title = this.createTitle(domainInfo);
    const message = this.createMessage(domainInfo);
    
    Logger.warn(`Sending notification for ${domainInfo.domain}: ${title}`);
    
    try {
      // Extract topic from URL
      const urlParts = this.ntfyUrl.split('/');
      const topic = urlParts[urlParts.length - 1];
      
      // Create notification payload
      const payload = {
        topic: topic,
        title: title,
        message: message,
        priority: this.getPriorityLevel(),
        tags: ["domain", "expiration", "warning"],
        click: `https://${domainInfo.domain}`
      };
      
      // Set up headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authentication if provided
      if (this.auth && this.auth.username && this.auth.password) {
        const authString = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${authString}`;
        Logger.debug('Using basic authentication for ntfy.sh');
      }
      
      // Get base URL (without topic)
      const baseUrl = this.ntfyUrl.substring(0, this.ntfyUrl.lastIndexOf('/'));
      
      // Send the notification
      const response = await fetch(baseUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: headers
      });
      
      // Check response status
      if (!response.ok) {
        const errorText = await response.text();
        Logger.error(`Notification failed with status ${response.status}: ${errorText}`);
        done('failed');
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: errorText
        };
      }
      
      // Parse response
      const responseData = await response.json().catch(() => null);
      
      Logger.info(`Notification sent successfully for ${domainInfo.domain}`);
      done('completed');
      
      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: responseData
      };
    } catch (error) {
      Logger.error(`Error sending notification for ${domainInfo.domain}:`, error);
      done('failed');
      
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Convert priority string to numeric value
   * @returns {number} Priority level (1-5)
   */
  getPriorityLevel() {
    switch (this.priority) {
      case 'min':
        return 1;
      case 'low':
        return 2;
      case 'default':
        return 3;
      case 'high':
        return 4;
      case 'max':
        return 5;
      default:
        return 3;
    }
  }
} 