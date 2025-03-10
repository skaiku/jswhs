import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import whois from 'whois-json';
import { Utils } from './utils.js';

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
  }

  setupMiddleware() {
    this.app.use(bodyParser.json());
    this.app.use(express.static(join(__dirname, '../public')));
  }

  setupRoutes() {
    this.app.get('/api/config', async (req, res) => {
      try {
        const { config, domains } = await Utils.loadConfig();
        res.json({ config, domains });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/config', async (req, res) => {
      try {
        /** @type {{config: import('./interfaces.js').AppConfig, domains: import('./interfaces.js').DomainsConfig}} */
        const { config, domains } = req.body;
        
        await Utils.saveConfig(config, domains);

        if (this.onConfigUpdate) {
          await this.onConfigUpdate();
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/domains/status', async (req, res) => {
      try {
        // Get status from cache instead of doing WHOIS queries
        const statusData = await Utils.loadDomainStatusCache();
        res.json(statusData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/domains/:domain/whois', async (req, res) => {
      try {
let domain = req.params.domain;
        console.log(`🔍 WHOIS details requested for domain: ${domain}`);
        console.time(`WHOIS query for ${domain}`);
        const result = await whois(domain);
        
        console.timeEnd(`WHOIS query for ${domain}`);
        console.log('\n====================================================');
        console.log(`🌐 WHOIS DETAILS FOR: ${domain.toUpperCase()}`);
        console.log('====================================================');
        
        // Log key information separately for quick reference
        if (result.domainName) console.log(`Domain Name: ${result.domainName}`);
        if (result.registrar) console.log(`Registrar: ${result.registrar}`);
        if (result.registrarUrl) console.log(`Registrar URL: ${result.registrarUrl}`);
        if (result.updatedDate) console.log(`Updated Date: ${result.updatedDate}`);
        if (result.creationDate) console.log(`Creation Date: ${result.creationDate}`);
        if (result.expirationDate || result.registryExpiryDate || result.expiresOn) {
            console.log(`Expiration Date: ${result.expirationDate || result.registryExpiryDate || result.expiresOn}`);
        }
        if (result.nameServers) console.log(`Name Servers: ${result.nameServers}`);
        
        // Log the full response
        console.log('\nFull WHOIS Response:');
        console.log(result);
        console.log('====================================================\n');
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Start the web server
   * @param {number} initialPort - Starting port to try
   * @param {number} maxAttempts - Maximum number of ports to try
   * @returns {Promise<number>} The port the server is running on
   */
  async start(initialPort = 3000, maxAttempts = 10) {
    for (let port = initialPort; port < initialPort + maxAttempts; port++) {
      try {
        await new Promise((resolve, reject) => {
          this.server = createServer(this.app);
          
          this.server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              console.log(`Port ${port} is in use, trying next port...`);
              this.server.close();
              resolve(false);
            } else {
              reject(err);
            }
          });

          this.server.listen(port, () => {
            console.log(`Web interface running at http://localhost:${port}`);
            resolve(true);
          });
        });

        return port;
      } catch (error) {
        console.error(`Error starting server on port ${port}:`, error);
        if (port === initialPort + maxAttempts - 1) {
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
        resolve();
        return;
      }
      this.server.close(() => resolve());
    });
  }
} 