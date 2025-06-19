class AdminPanel {
    constructor() {
        this.socket = io();
        this.loginScreen = document.getElementById('loginScreen');
        this.dashboard = document.getElementById('dashboard');
        this.loginForm = document.getElementById('loginForm');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.reportsTableBody = document.getElementById('reportsTableBody');
        
        // Stats elements
        this.activeUsers = document.getElementById('activeUsers');
        this.activeChats = document.getElementById('activeChats');
        this.reportsToday = document.getElementById('reportsToday');
        this.totalReports = document.getElementById('totalReports');

        this.reports = new Map(); // Store reports data
        
        this.initializeEventListeners();
        this.initializeSocketListeners();
        this.checkAuthStatus();
    }

    initializeEventListeners() {
        // Login form submission
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            this.login(username, password);
        });

        // Logout button
        this.logoutBtn.addEventListener('click', () => this.logout());
    }

    initializeSocketListeners() {
        // Listen for new reports
        this.socket.on('newReport', (report) => {
            this.addReport(report);
            this.updateStats();
        });

        // Listen for stats updates
        this.socket.on('statsUpdate', (stats) => {
            this.updateStatsDisplay(stats);
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/admin/check-auth');
            if (response.ok) {
                this.showDashboard();
                this.loadInitialData();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    }

    async login(username, password) {
        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                this.showDashboard();
                this.loadInitialData();
            } else {
                alert('Invalid credentials');
            }
        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed. Please try again.');
        }
    }

    async logout() {
        try {
            await fetch('/admin/logout', { method: 'POST' });
            this.showLogin();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    showLogin() {
        this.loginScreen.classList.add('active');
        this.dashboard.classList.remove('active');
    }

    showDashboard() {
        this.loginScreen.classList.remove('active');
        this.dashboard.classList.add('active');
    }

    async loadInitialData() {
        try {
            // Load reports
            const reportsResponse = await fetch('/admin/reports');
            const reports = await reportsResponse.json();
            reports.forEach(report => this.addReport(report));

            // Load stats
            const statsResponse = await fetch('/admin/stats');
            const stats = await statsResponse.json();
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    addReport(report) {
        this.reports.set(report.id, report);
        
        const row = document.createElement('tr');
        row.id = `report-${report.id}`;
        row.innerHTML = `
            <td>${new Date(report.timestamp).toLocaleString()}</td>
            <td>${this.truncateId(report.reporterId)}</td>
            <td>${this.truncateId(report.reportedId)}</td>
            <td>${this.escapeHtml(report.reason)}</td>
            <td>
                <span class="badge badge-${this.getStatusBadgeClass(report.status)}">
                    ${report.status}
                </span>
            </td>
            <td>
                <button class="btn btn-danger" onclick="adminPanel.banUser('${report.reportedId}')">
                    Ban User
                </button>
            </td>
        `;

        // Add to table or update existing row
        const existingRow = this.reportsTableBody.querySelector(`#report-${report.id}`);
        if (existingRow) {
            existingRow.replaceWith(row);
        } else {
            this.reportsTableBody.insertBefore(row, this.reportsTableBody.firstChild);
        }
    }

    async banUser(userId) {
        if (!confirm('Are you sure you want to ban this user?')) return;

        try {
            const response = await fetch('/admin/ban-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });

            if (response.ok) {
                alert('User has been banned');
                // Update any related reports
                this.reports.forEach(report => {
                    if (report.reportedId === userId) {
                        report.status = 'resolved';
                        this.addReport(report);
                    }
                });
            } else {
                alert('Failed to ban user');
            }
        } catch (error) {
            console.error('Error banning user:', error);
            alert('Failed to ban user');
        }
    }

    updateStatsDisplay(stats) {
        this.activeUsers.textContent = stats.activeUsers;
        this.activeChats.textContent = stats.activeChats;
        this.reportsToday.textContent = stats.reportsToday;
        this.totalReports.textContent = stats.totalReports;
    }

    getStatusBadgeClass(status) {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'warning';
            case 'resolved':
                return 'success';
            case 'escalated':
                return 'danger';
            default:
                return 'warning';
        }
    }

    truncateId(id) {
        return id.substring(0, 8) + '...';
    }

    escapeHtml(unsafe) {
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    }
}

// Initialize admin panel when the page loads
const adminPanel = new AdminPanel();
