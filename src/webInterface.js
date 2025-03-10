import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import whois from 'whois-json';
import { Utils } from './utils.js';
import { Logger } from './logger.js';
import { Notifier } from './notifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Class to provide web interface for configuration and status
 */
export class WebInterface {
  /**
   * @param {Function} onConfigUpdate - Callback to run when config is updated
   */
  constructor(onConfigUpdate) {
    this.app = express();
    this.server = null;
    this.onConfigUpdate = onConfigUpdate;
    this.setupMiddleware();
    this.setupRoutes();
    Logger.debug('WebInterface initialized');
  }

  setupMiddleware() {
    this.app.use(bodyParser.json());
    this.app.use(express.static(join(__dirname, '../public')));
    Logger.debug('WebInterface middleware set up');
  }

  setupRoutes() {
    this.app.get('/api/config', async (req, res) => {
      try {
        Logger.debug('GET /api/config requested');
        const { config, domains } = await Utils.loadConfig();
        res.json({ config, domains });
        Logger.debug('GET /api/config responded successfully');
      } catch (error) {
        Logger.error('Error handling GET /api/config:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/config', async (req, res) => {
      try {
        Logger.debug('POST /api/config requested');
        const { config, domains } = req.body;
        
        await Utils.saveConfig(config, domains);

        if (this.onConfigUpdate) {
          Logger.debug('Running onConfigUpdate callback');
          await this.onConfigUpdate();
        }

        res.json({ success: true });
        Logger.debug('POST /api/config responded successfully');
      } catch (error) {
        Logger.error('Error handling POST /api/config:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/domains/status', async (req, res) => {
      try {
        Logger.debug('GET /api/domains/status requested');
        const statusData = await Utils.loadDomainStatusCache();
        res.json(statusData);
        Logger.debug(`GET /api/domains/status responded with ${statusData.length} domains`);
      } catch (error) {
        Logger.error('Error handling GET /api/domains/status:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/domains/:domain/whois', async (req, res) => {
      try {
        const domain = req.params.domain;
        Logger.debug(`GET /api/domains/${domain}/whois requested`);
        
        const result = await whois(domain);
        res.json(result);
        Logger.debug(`GET /api/domains/${domain}/whois responded successfully`);
      } catch (error) {
        Logger.error(`Error handling GET /api/domains/${req.params.domain}/whois:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/test-notification', async (req, res) => {
      try {
        Logger.debug('POST /api/test-notification requested');
        const { ntfyConfig } = req.body;
        
        if (!ntfyConfig || !ntfyConfig.url) {
          Logger.warn('Invalid ntfy configuration for test notification');
          return res.status(400).json({ error: 'Invalid ntfy configuration' });
        }
        
        // Validate URL format
        if (!ntfyConfig.url.includes('/')) {
          Logger.warn('Invalid ntfy URL format, must include topic (e.g., https://ntfy.sh/your-topic)');
          return res.status(400).json({ 
            error: 'Invalid ntfy URL format', 
            message: 'URL must include topic (e.g., https://ntfy.sh/your-topic)'
          });
        }
        
        // Create a test notification
        const notifier = new Notifier(ntfyConfig);
        
        // Create a test domain info object
        const testDomainInfo = {
          domain: 'example.com',
          description: 'Test Notification',
          expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          daysUntilExpiration: 15,
          needsWarning: true
        };
        
        // Send the test notification and get detailed result
        const result = await notifier.sendNotification(testDomainInfo);
        
        if (result.success) {
          Logger.info('Test notification sent successfully', result);
          res.json({ 
            success: true, 
            message: 'Notification sent successfully',
            details: result
          });
        } else {
          Logger.warn('Test notification failed', result);
          res.status(400).json({
            success: false,
            error: 'Failed to send notification',
            details: result
          });
        }
      } catch (error) {
        Logger.error('Error sending test notification:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to send test notification', 
          message: error.message,
          stack: error.stack
        });
      }
    });
    
    Logger.debug('WebInterface routes set up');
  }

  /**
   * Start the web server
   * @param {number} initialPort - Starting port to try
   * @param {number} maxAttempts - Maximum number of ports to try
   * @returns {Promise<number>} The port the server is running on
   */
  async start(initialPort = 3000, maxAttempts = 10) {
    Logger.info(`Starting web server (trying ports ${initialPort}-${initialPort + maxAttempts - 1})`);
    
    for (let port = initialPort; port < initialPort + maxAttempts; port++) {
      try {
        await new Promise((resolve, reject) => {
          this.server = createServer(this.app);
          
          this.server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              Logger.warn(`Port ${port} is in use, trying next port...`);
              this.server.close();
              resolve(false);
            } else {
              Logger.error(`Error starting server on port ${port}:`, err);
              reject(err);
            }
          });

          this.server.listen(port, () => {
            Logger.info(`Web interface running at http://localhost:${port}`);
            resolve(true);
          });
        });

        return port;
      } catch (error) {
        Logger.error(`Error starting server on port ${port}:`, error);
        if (port === initialPort + maxAttempts - 1) {
          Logger.error('Failed to find an available port');
          throw new Error('Failed to find an available port');
        }
      }
    }
  }

  /**
   * Stop the web server
   * @returns {Promise<void>}
   */
  async stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        Logger.debug('No server to stop');
        resolve();
        return;
      }
      this.server.close(() => {
        Logger.info('Web server stopped');
        resolve();
      });
    });
  }
} 