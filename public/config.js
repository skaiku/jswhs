let currentConfig = null;

/**
 * Client-side logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case 'debug':
      console.debug(formattedMessage, ...args);
      break;
    case 'info':
      console.info(formattedMessage, ...args);
      break;
    case 'warn':
      console.warn(formattedMessage, ...args);
      break;
    case 'error':
      console.error(formattedMessage, ...args);
      break;
    default:
      console.log(formattedMessage, ...args);
  }
}

/**
 * Load configuration data
 */
async function loadConfig() {
    try {
        log('info', 'Loading configuration');
        const response = await fetch('/api/config');
        const data = await response.json();
        
        // Fill in the form
        document.getElementById('ntfyUrl').value = data.config.ntfy.url;
        document.getElementById('priority').value = data.config.ntfy.priority;
        document.getElementById('checkInterval').value = data.config.checkInterval;
        document.getElementById('warningDays').value = data.config.warningDays;
        document.getElementById('logLevel').value = data.config.logLevel || 'info';
        
        // Set checkbox values
        document.getElementById('recalculateAfterSave').checked = 
            data.config.recalculateAfterSave === true;
        document.getElementById('useCache').checked = 
            data.config.useCache === true;
        
        // Load domains
        const domainsList = document.getElementById('domains-list');
        domainsList.innerHTML = '';
        data.domains.domains.forEach(domain => {
            addDomainToList(domain);
        });
        
        log('info', `Loaded configuration with ${data.domains.domains.length} domains`);
        toast.info('Configuration Loaded', 'Configuration loaded successfully');
    } catch (error) {
        log('error', 'Error loading config:', error);
        toast.error('Loading Error', 'Failed to load configuration');
    }
}

/**
 * Add a new domain input to the form
 */
function addDomain(domain = '', description = '') {
    log('debug', `Adding domain input: ${domain}, ${description}`);
    const domainEntry = document.createElement('div');
    domainEntry.className = 'domain-entry';
    domainEntry.innerHTML = `
        <div class="domain-inputs">
            <input type="text" class="domain-input" value="${domain}" placeholder="example.com">
            <input type="text" class="description-input" value="${description}" placeholder="Description">
        </div>
        <button onclick="this.parentElement.remove()" class="btn-remove">Remove</button>
    `;
    document.getElementById('domains-list').appendChild(domainEntry);
}

/**
 * Add a domain object to the list
 */
function addDomainToList(domainObj) {
    addDomain(domainObj.domain, domainObj.description);
}

/**
 * Save configuration data
 */
async function saveConfig() {
    log('info', 'Saving configuration');
    const config = {
        ntfy: {
            url: document.getElementById('ntfyUrl').value,
            priority: document.getElementById('priority').value
        },
        checkInterval: document.getElementById('checkInterval').value,
        warningDays: parseInt(document.getElementById('warningDays').value),
        recalculateAfterSave: document.getElementById('recalculateAfterSave').checked,
        useCache: document.getElementById('useCache').checked,
        logLevel: document.getElementById('logLevel').value
    };

    const domains = {
        domains: Array.from(document.getElementsByClassName('domain-entry')).map(entry => ({
            domain: entry.querySelector('.domain-input').value.trim(),
            description: entry.querySelector('.description-input').value.trim()
        })).filter(d => d.domain !== '')
    };

    log('debug', `Saving configuration with ${domains.domains.length} domains`);
    log('debug', 'Config:', config);

    try {
        toast.info('Saving...', 'Saving your configuration');
        
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config, domains })
        });

        if (response.ok) {
            log('info', 'Configuration saved successfully');
            toast.success('Saved', 'Configuration saved successfully');
            // Wait a moment to show the success message before redirecting
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            throw new Error('Failed to save configuration');
        }
    } catch (error) {
        log('error', 'Error saving config:', error);
        toast.error('Save Error', 'Failed to save configuration');
    }
}

// Load config when page loads
document.addEventListener('DOMContentLoaded', () => {
    log('info', 'Configuration page loaded');
    loadConfig();
}); 