let currentConfig = null;

/**
 * Load configuration data
 */
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        currentConfig = data;
        
        // Fill in the form
        document.getElementById('ntfyUrl').value = data.config.ntfy.url;
        document.getElementById('priority').value = data.config.ntfy.priority;
        document.getElementById('checkInterval').value = data.config.checkInterval;
        document.getElementById('warningDays').value = data.config.warningDays;
        
        // Load domains
        const domainsList = document.getElementById('domains-list');
        domainsList.innerHTML = '';
        data.domains.domains.forEach(domain => {
            addDomainToList(domain);
        });
    } catch (error) {
        console.error('Error loading config:', error);
        alert('Error loading configuration');
    }
}

/**
 * Add a new domain input to the form
 */
function addDomain(domain = '', description = '') {
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
    const config = {
        ntfy: {
            url: document.getElementById('ntfyUrl').value,
            priority: document.getElementById('priority').value
        },
        checkInterval: document.getElementById('checkInterval').value,
        warningDays: parseInt(document.getElementById('warningDays').value)
    };

    const domains = {
        domains: Array.from(document.getElementsByClassName('domain-entry')).map(entry => ({
            domain: entry.querySelector('.domain-input').value.trim(),
            description: entry.querySelector('.description-input').value.trim()
        })).filter(d => d.domain !== '')
    };

    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config, domains })
        });

        if (response.ok) {
            alert('Configuration saved successfully');
            window.location.href = '/';  // Redirect to dashboard after saving
        } else {
            throw new Error('Failed to save configuration');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        alert('Error saving configuration');
    }
}

// Load config when page loads
document.addEventListener('DOMContentLoaded', loadConfig); 