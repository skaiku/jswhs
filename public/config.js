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
        
        // Fill in authentication fields if they exist
        if (data.config.ntfy.auth) {
            document.getElementById('ntfyUsername').value = data.config.ntfy.auth.username || '';
            document.getElementById('ntfyPassword').value = data.config.ntfy.auth.password || '';
        }
        
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
    } catch (error) {
        log('error', 'Error loading config:', error);
        toast.error('Loading Error', 'Failed to load configuration');
    }
}

/**
 * Add a new domain input to the form
 */
function addDomain(domain = '', description = '', manualExpirationDate = '') {
    log('debug', `Adding domain input: ${domain}, ${description}, ${manualExpirationDate}`);
    const domainEntry = document.createElement('div');
    domainEntry.className = 'domain-entry';
    domainEntry.innerHTML = `
        <div class="domain-field">
            <label>Domain</label>
            <input type="text" class="domain-input" value="${domain}" placeholder="example.com">
        </div>
        <div class="domain-field">
            <label>Description</label>
            <input type="text" class="description-input" value="${description}" placeholder="Optional description">
        </div>
        <div class="domain-field">
            <label>Manual Expiration (Fallback)</label>
            <input type="date" class="manual-expiration-input" value="${manualExpirationDate}">
        </div>
        <button onclick="this.parentElement.remove()" class="btn-remove btn-small" title="Remove domain">
            <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
        </button>
    `;
    document.getElementById('domains-list').appendChild(domainEntry);
}

/**
 * Add a domain object to the list
 */
function addDomainToList(domainObj) {
    addDomain(domainObj.domain, domainObj.description || '', domainObj.manualExpirationDate || '');
}

/**
 * Save configuration data
 */
async function saveConfig() {
    log('info', 'Saving configuration');
    
    // Clear previous input validation errors
    document.querySelectorAll('.domain-input').forEach(el => el.classList.remove('input-error'));
    
    const domainEntries = Array.from(document.getElementsByClassName('domain-entry'));
    
    // Check for duplicate domains (case-insensitive)
    const domainCounts = {};
    const duplicates = new Set();
    
    domainEntries.forEach(entry => {
        const input = entry.querySelector('.domain-input');
        const val = input.value.trim().toLowerCase();
        if (val) {
            domainCounts[val] = (domainCounts[val] || 0) + 1;
            if (domainCounts[val] > 1) {
                duplicates.add(val);
            }
        }
    });
    
    if (duplicates.size > 0) {
        // Highlight duplicate inputs
        domainEntries.forEach(entry => {
            const input = entry.querySelector('.domain-input');
            const val = input.value.trim().toLowerCase();
            if (duplicates.has(val)) {
                input.classList.add('input-error');
            }
        });
        
        const duplicateNames = Array.from(duplicates).join(', ');
        toast.error('Duplicate Domains Found', `Please remove or edit duplicates: ${duplicateNames}`);
        log('warn', `Duplicate domains detected: ${duplicateNames}`);
        return;
    }

    const config = {
        ntfy: {
            url: document.getElementById('ntfyUrl').value,
            priority: document.getElementById('priority').value,
            auth: {
                username: document.getElementById('ntfyUsername').value,
                password: document.getElementById('ntfyPassword').value
            }
        },
        checkInterval: document.getElementById('checkInterval').value,
        warningDays: parseInt(document.getElementById('warningDays').value),
        recalculateAfterSave: document.getElementById('recalculateAfterSave').checked,
        useCache: document.getElementById('useCache').checked,
        logLevel: document.getElementById('logLevel').value
    };

    const domains = {
        domains: Array.from(document.getElementsByClassName('domain-entry')).map(entry => {
            const domainVal = entry.querySelector('.domain-input').value.trim();
            const descVal = entry.querySelector('.description-input').value.trim();
            const manualDate = entry.querySelector('.manual-expiration-input').value;
            
            const item = { domain: domainVal, description: descVal };
            if (manualDate) {
                item.manualExpirationDate = manualDate;
            }
            return item;
        }).filter(d => d.domain !== '')
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

/**
 * Show CSV Import Modal
 */
function showCSVImportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'csv-modal-title');
    
    modal.innerHTML = `
        <div class="modal-content glassmorphism" style="max-width: 550px;">
            <button class="close" aria-label="Close">&times;</button>
            <h2 id="csv-modal-title">Import Domains from CSV</h2>
            <p class="modal-subtitle">Paste CSV text below. Format: <code>domain,description,manualDate</code> (one per line, description & date are optional)</p>
            
            <div class="modal-form">
                <div class="form-group">
                    <textarea id="csvImportArea" class="csv-textarea" placeholder="google.com,Google Search,2027-12-31&#10;example.org,My description&#10;another.com,,2026-06-30"></textarea>
                </div>
                
                <div class="modal-actions">
                    <button id="importCsvBtn" class="btn-primary">Import</button>
                    <button id="cancelCsvBtn" class="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Apply dark mode compatible
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        modal.classList.add('dark-mode-compatible');
    }
    
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('#cancelCsvBtn');
    const importBtn = modal.querySelector('#importCsvBtn');
    const csvArea = modal.querySelector('#csvImportArea');
    
    const closeModal = () => modal.remove();
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    importBtn.onclick = () => {
        const csvText = csvArea.value.trim();
        if (!csvText) {
            toast.error('Validation Error', 'Please paste some CSV data first');
            return;
        }
        
        // Gather existing domains (case-insensitive) to skip duplicates
        const existingDomains = new Set(
            Array.from(document.querySelectorAll('.domain-input'))
                .map(el => el.value.trim().toLowerCase())
                .filter(val => val !== '')
        );
        
        const lines = csvText.split('\n');
        let importCount = 0;
        let duplicateCount = 0;
        let skippedInvalid = 0;
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return; // skip empty lines
            
            const columns = trimmedLine.split(',');
            const domain = columns[0] ? columns[0].trim() : '';
            const description = columns[1] ? columns[1].trim() : '';
            const manualDate = columns[2] ? columns[2].trim() : '';
            
            if (!domain) {
                skippedInvalid++;
                return;
            }
            
            const domainLower = domain.toLowerCase();
            if (existingDomains.has(domainLower)) {
                duplicateCount++;
            } else {
                // Add to list and add to set to avoid duplicates within the imported CSV itself
                addDomain(domain, description, manualDate);
                existingDomains.add(domainLower);
                importCount++;
            }
        });
        
        closeModal();
        
        // Show results toast
        if (importCount > 0) {
            let msg = `Successfully imported ${importCount} domain${importCount > 1 ? 's' : ''}.`;
            if (duplicateCount > 0) {
                msg += ` Skipped ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''}.`;
            }
            if (skippedInvalid > 0) {
                msg += ` Ignored ${skippedInvalid} invalid line${skippedInvalid > 1 ? 's' : ''}.`;
            }
            toast.success(msg, 'Import Complete');
        } else {
            if (duplicateCount > 0) {
                toast.warning(`No domains imported. All ${duplicateCount} domains already exist in the list.`, 'Import Skipped');
            } else {
                toast.error('No domains imported. Invalid CSV format.', 'Import Failed');
            }
        }
    };
}

/**
 * Tests the notification service with the current settings
 */
async function testNotification() {
    const testResult = document.getElementById('testResult');
    testResult.textContent = 'Sending...';
    testResult.className = 'test-result';
    
    try {
        // Get notification settings
        const ntfyUrl = document.getElementById('ntfyUrl').value.trim();
        
        if (!ntfyUrl) {
            throw new Error('Please enter a ntfy.sh URL');
        }
        
        const response = await fetch('/api/test-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: ntfyUrl,
                priority: document.getElementById('priority').value,
                username: document.getElementById('ntfyUsername').value.trim(),
                password: document.getElementById('ntfyPassword').value.trim()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            testResult.textContent = 'Success! Notification sent.';
            testResult.className = 'test-result test-success';
            toast.success('Notification Sent', 'Test notification sent successfully.');
        } else {
            const errorMessage = data.error || 'Unknown error';
            testResult.textContent = `Error: ${errorMessage}`;
            testResult.className = 'test-result test-error';
            toast.error('Notification Failed', errorMessage);
        }
    } catch (error) {
        testResult.textContent = `Error: ${error.message}`;
        testResult.className = 'test-result test-error';
        toast.error('Notification Error', error.message);
    }
}

// Add accordion functionality
function toggleSection(headerElement) {
    const section = headerElement.parentElement;
    const content = section.querySelector('.section-content');
    const icon = section.querySelector('.section-icon');
    
    // Check if this section is already open
    const isOpen = content.classList.contains('open');
    
    // First close all sections
    document.querySelectorAll('.section-content').forEach(el => {
        el.classList.remove('open');
    });
    
    document.querySelectorAll('.section-icon').forEach(el => {
        el.classList.remove('open');
    });
    
    // Then open the clicked one if it was closed
    if (!isOpen) {
        content.classList.add('open');
        icon.classList.add('open');
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Open the first section by default
    const firstSection = document.querySelector('.config-section');
    if (firstSection) {
        const header = firstSection.querySelector('.section-header');
        if (header) {
            toggleSection(header);
        }
    }
    
    // Setup test notification button
    const testBtn = document.getElementById('testNotification');
    if (testBtn) {
        testBtn.addEventListener('click', testNotification);
    }
    
    // Load saved configuration
    loadConfig();
}); 