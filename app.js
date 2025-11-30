// Time Tracker Application

class TimeTracker {
    constructor() {
        this.records = [];
        this.projects = new Set();
        this.currentTimer = null;
        this.startTime = null;
        this.pausedTime = 0;
        this.isPaused = false;
        this.currentProject = '';
        this.timerInterval = null;
        this.githubConfig = {
            token: '',
            username: '',
            repo: '',
            autoSync: false
        };
        this.autoSyncInterval = null;
        this.currentEditingRecordId = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.loadGithubConfig();
        this.setupEventListeners();
        this.updateUI();
        this.setupAutoSync();
    }

    loadData() {
        const savedRecords = this.getFromMemory('timeTrackerRecords');
        if (savedRecords) {
            this.records = savedRecords;
            this.records.forEach(record => this.projects.add(record.project));
        }
    }

    loadGithubConfig() {
        const savedConfig = this.getFromMemory('githubConfig');
        if (savedConfig) {
            this.githubConfig = savedConfig;
            this.updateSyncStatus(true);
            this.updateDashboardLink();
        }
    }

    saveData() {
        this.saveToMemory('timeTrackerRecords', this.records);
    }

    saveGithubConfig() {
        this.saveToMemory('githubConfig', this.githubConfig);
    }

    // Simple in-memory storage simulation
    getFromMemory(key) {
        if (!window.appStorage) window.appStorage = {};
        return window.appStorage[key] || null;
    }

    saveToMemory(key, value) {
        if (!window.appStorage) window.appStorage = {};
        window.appStorage[key] = value;
    }

    setupEventListeners() {
        // Timer controls
        document.getElementById('startBtn').addEventListener('click', () => this.startTimer());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseTimer());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopTimer());

        // Project input
        document.getElementById('newProject').addEventListener('input', (e) => {
            if (e.target.value) {
                document.getElementById('projectSelect').value = '';
            }
        });

        document.getElementById('projectSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                document.getElementById('newProject').value = '';
            }
        });

        // Config modal
        document.getElementById('configBtn').addEventListener('click', () => this.openConfigModal());
        document.getElementById('closeConfigBtn').addEventListener('click', () => this.closeConfigModal());
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        // Share modal
        document.getElementById('shareBtn').addEventListener('click', () => this.openShareModal());
        document.getElementById('closeShareBtn').addEventListener('click', () => this.closeShareModal());
        document.getElementById('copyLinkBtn').addEventListener('click', () => this.copyShareLink());
        document.getElementById('openDashboardBtn').addEventListener('click', () => this.openDashboard());

        // Notes modal
        document.getElementById('closeNotesBtn').addEventListener('click', () => this.closeNotesModal());
        document.getElementById('saveNotesBtn').addEventListener('click', () => this.saveNotes());

        // Sync
        document.getElementById('syncBtn').addEventListener('click', () => this.syncToGithub());

        // Export
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJSON());

        // Filter
        document.getElementById('filterDate').addEventListener('change', () => this.updateRecordsList());

        // Update dashboard link when config changes
        ['githubUsername', 'githubRepo'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updateDashboardLinkPreview();
            });
        });
    }

    startTimer() {
        const projectSelect = document.getElementById('projectSelect').value;
        const newProject = document.getElementById('newProject').value.trim();
        
        this.currentProject = newProject || projectSelect;
        
        if (!this.currentProject) {
            alert('请选择或输入项目名称');
            return;
        }

        if (this.isPaused) {
            // Resume from pause
            this.isPaused = false;
        } else {
            // Start new timer
            this.startTime = Date.now();
            this.pausedTime = 0;
        }

        this.timerInterval = setInterval(() => this.updateTimerDisplay(), 100);

        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('projectSelect').disabled = true;
        document.getElementById('newProject').disabled = true;
    }

    pauseTimer() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pausedTime = Date.now() - this.startTime;
            clearInterval(this.timerInterval);
            
            document.getElementById('pauseBtn').textContent = '▶️ 继续';
            document.getElementById('pauseBtn').classList.remove('btn--warning');
            document.getElementById('pauseBtn').classList.add('btn--success');
        } else {
            // Resume
            this.startTimer();
            document.getElementById('pauseBtn').textContent = '⏸️ 暂停';
            document.getElementById('pauseBtn').classList.remove('btn--success');
            document.getElementById('pauseBtn').classList.add('btn--warning');
        }
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        
        const duration = this.isPaused ? this.pausedTime : Date.now() - this.startTime;
        
        const record = {
            id: Date.now(),
            project: this.currentProject,
            startTime: this.startTime,
            duration: duration,
            date: new Date(this.startTime).toISOString(),
            notes: ''
        };

        this.records.unshift(record);
        this.projects.add(this.currentProject);
        this.saveData();

        // Reset timer
        this.startTime = null;
        this.pausedTime = 0;
        this.isPaused = false;
        this.currentProject = '';

        document.getElementById('timerDisplay').textContent = '00:00:00';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('projectSelect').disabled = false;
        document.getElementById('newProject').disabled = false;
        document.getElementById('pauseBtn').textContent = '⏸️ 暂停';
        document.getElementById('pauseBtn').classList.remove('btn--success');
        document.getElementById('pauseBtn').classList.add('btn--warning');

        this.updateUI();
        
        if (this.githubConfig.autoSync && this.githubConfig.token) {
            this.syncToGithub();
        }
    }

    updateTimerDisplay() {
        const elapsed = this.isPaused ? this.pausedTime : Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000) % 60;
        const minutes = Math.floor(elapsed / 60000) % 60;
        const hours = Math.floor(elapsed / 3600000);

        document.getElementById('timerDisplay').textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateUI() {
        this.updateProjectSelect();
        this.updateStats();
        this.updateRecordsList();
    }

    updateProjectSelect() {
        const select = document.getElementById('projectSelect');
        select.innerHTML = '<option value="">-- 选择项目 --</option>';
        
        Array.from(this.projects).forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            select.appendChild(option);
        });
    }

    updateStats() {
        const totalProjects = this.projects.size;
        const totalDuration = this.records.reduce((sum, r) => sum + r.duration, 0);
        const totalHours = (totalDuration / 3600000).toFixed(1);
        
        const today = new Date().toDateString();
        const todayRecords = this.records.filter(r => 
            new Date(r.date).toDateString() === today
        ).length;

        const statsHtml = `
            <div class="stat-item">
                <span class="stat-value">${totalProjects}</span>
                <span class="stat-label">总项目数</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${totalHours}h</span>
                <span class="stat-label">总时长</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${todayRecords}</span>
                <span class="stat-label">今日记录</span>
            </div>
        `;

        document.getElementById('statsGrid').innerHTML = statsHtml;
    }

    updateRecordsList() {
        const filterDate = document.getElementById('filterDate').value;
        let filteredRecords = this.records;

        if (filterDate) {
            const targetDate = new Date(filterDate).toDateString();
            filteredRecords = this.records.filter(r => 
                new Date(r.date).toDateString() === targetDate
            );
        }

        const recordsList = document.getElementById('recordsList');
        
        if (filteredRecords.length === 0) {
            recordsList.innerHTML = '<div class="empty-state">暂无记录</div>';
            return;
        }

        recordsList.innerHTML = filteredRecords.map(record => {
            const date = new Date(record.date);
            const duration = this.formatDuration(record.duration);
            
            return `
                <div class="record-item">
                    <div class="record-info">
                        <div class="record-project">${record.project}</div>
                        <div class="record-time">
                            ${date.toLocaleString('zh-CN')} · 
                            <span class="record-duration">${duration}</span>
                        </div>
                        ${record.notes ? `<div class="record-notes">📝 ${record.notes}</div>` : ''}
                    </div>
                    <div class="record-actions">
                        <button class="btn-icon" onclick="app.openNotesModal(${record.id})" title="添加备注">📝</button>
                        <button class="btn-icon" onclick="app.deleteRecord(${record.id})" title="删除">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000) % 60;
        const minutes = Math.floor(ms / 60000) % 60;
        const hours = Math.floor(ms / 3600000);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    deleteRecord(id) {
        if (confirm('确定要删除这条记录吗？')) {
            this.records = this.records.filter(r => r.id !== id);
            this.saveData();
            this.updateUI();
            
            if (this.githubConfig.autoSync && this.githubConfig.token) {
                this.syncToGithub();
            }
        }
    }

    openNotesModal(id) {
        this.currentEditingRecordId = id;
        const record = this.records.find(r => r.id === id);
        if (record) {
            document.getElementById('recordNotes').value = record.notes || '';
            document.getElementById('notesModal').classList.add('active');
        }
    }

    closeNotesModal() {
        document.getElementById('notesModal').classList.remove('active');
        this.currentEditingRecordId = null;
    }

    saveNotes() {
        const notes = document.getElementById('recordNotes').value.trim();
        const record = this.records.find(r => r.id === this.currentEditingRecordId);
        
        if (record) {
            record.notes = notes;
            this.saveData();
            this.updateRecordsList();
            this.closeNotesModal();
            
            if (this.githubConfig.autoSync && this.githubConfig.token) {
                this.syncToGithub();
            }
        }
    }

    openConfigModal() {
        document.getElementById('githubToken').value = this.githubConfig.token || '';
        document.getElementById('githubUsername').value = this.githubConfig.username || '';
        document.getElementById('githubRepo').value = this.githubConfig.repo || '';
        document.getElementById('autoSync').checked = this.githubConfig.autoSync || false;
        
        this.updateDashboardLinkPreview();
        document.getElementById('configModal').classList.add('active');
    }

    closeConfigModal() {
        document.getElementById('configModal').classList.remove('active');
    }

    saveConfig() {
        this.githubConfig.token = document.getElementById('githubToken').value.trim();
        this.githubConfig.username = document.getElementById('githubUsername').value.trim();
        this.githubConfig.repo = document.getElementById('githubRepo').value.trim();
        this.githubConfig.autoSync = document.getElementById('autoSync').checked;

        if (!this.githubConfig.token || !this.githubConfig.username || !this.githubConfig.repo) {
            alert('请填写完整的 GitHub 配置信息');
            return;
        }

        this.saveGithubConfig();
        this.updateSyncStatus(true);
        this.updateDashboardLink();
        this.setupAutoSync();
        this.closeConfigModal();

        alert('GitHub 配置已保存！');
        this.syncToGithub();
    }

    updateSyncStatus(connected) {
        const statusEl = document.getElementById('syncStatus');
        if (connected && this.githubConfig.token) {
            statusEl.className = 'sync-status connected';
            statusEl.innerHTML = '<span>✅ 已连接 GitHub</span>';
        } else {
            statusEl.className = 'sync-status disconnected';
            statusEl.innerHTML = '<span>⚠️ 未配置 GitHub</span>';
        }
    }

    updateDashboardLink() {
        const infoEl = document.getElementById('dashboardLinkInfo');
        const linkEl = document.getElementById('dashboardPreviewLink');
        
        if (this.githubConfig.username && this.githubConfig.repo) {
            const dashboardUrl = this.generateDashboardUrl();
            linkEl.href = dashboardUrl;
            linkEl.textContent = dashboardUrl;
            infoEl.style.display = 'block';
        } else {
            infoEl.style.display = 'none';
        }
    }

    updateDashboardLinkPreview() {
        const username = document.getElementById('githubUsername').value.trim();
        const repo = document.getElementById('githubRepo').value.trim();
        const infoEl = document.getElementById('dashboardLinkInfo');
        const linkEl = document.getElementById('dashboardPreviewLink');
        
        if (username && repo) {
            const dashboardUrl = `https://${username}.github.io/${repo}/dashboard.html`;
            linkEl.href = dashboardUrl;
            linkEl.textContent = dashboardUrl;
            infoEl.style.display = 'block';
        } else {
            infoEl.style.display = 'none';
        }
    }

    generateDashboardUrl() {
        return `https://${this.githubConfig.username}.github.io/${this.githubConfig.repo}/dashboard.html`;
    }

    openShareModal() {
        if (!this.githubConfig.username || !this.githubConfig.repo) {
            document.getElementById('shareContent').style.display = 'none';
            document.getElementById('shareWarning').style.display = 'block';
        } else {
            const dashboardUrl = this.generateDashboardUrl();
            document.getElementById('shareLinkDisplay').textContent = dashboardUrl;
            document.getElementById('shareContent').style.display = 'block';
            document.getElementById('shareWarning').style.display = 'none';
        }
        document.getElementById('shareModal').classList.add('active');
    }

    closeShareModal() {
        document.getElementById('shareModal').classList.remove('active');
    }

    async copyShareLink() {
        const link = this.generateDashboardUrl();
        try {
            await navigator.clipboard.writeText(link);
            const btn = document.getElementById('copyLinkBtn');
            const originalText = btn.textContent;
            btn.textContent = '✅ 已复制！';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (err) {
            alert('复制失败，请手动复制链接');
        }
    }

    openDashboard() {
        const url = this.generateDashboardUrl();
        window.open(url, '_blank');
    }

    async syncToGithub() {
        if (!this.githubConfig.token || !this.githubConfig.username || !this.githubConfig.repo) {
            alert('请先配置 GitHub 信息');
            return;
        }

        const btn = document.getElementById('syncBtn');
        const originalText = btn.textContent;
        btn.textContent = '🔄 同步中...';
        btn.disabled = true;

        try {
            const data = {
                records: this.records,
                projects: Array.from(this.projects),
                lastSync: new Date().toISOString()
            };

            const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
            const fileName = 'time-tracker-data.json';
            
            // Check if file exists
            let sha = null;
            try {
                const getResponse = await fetch(
                    `https://api.github.com/repos/${this.githubConfig.username}/${this.githubConfig.repo}/contents/${fileName}`,
                    {
                        headers: {
                            'Authorization': `token ${this.githubConfig.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (getResponse.ok) {
                    const fileData = await getResponse.json();
                    sha = fileData.sha;
                }
            } catch (e) {
                // File doesn't exist, that's okay
            }

            // Create or update file
            const response = await fetch(
                `https://api.github.com/repos/${this.githubConfig.username}/${this.githubConfig.repo}/contents/${fileName}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.githubConfig.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Update time tracker data - ${new Date().toISOString()}`,
                        content: content,
                        sha: sha
                    })
                }
            );

            if (response.ok) {
                btn.textContent = '✅ 同步成功';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
            } else {
                throw new Error('同步失败');
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('同步失败，请检查 GitHub 配置和网络连接');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    setupAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
        }

        if (this.githubConfig.autoSync && this.githubConfig.token) {
            this.autoSyncInterval = setInterval(() => {
                this.syncToGithub();
            }, 5 * 60 * 1000); // Every 5 minutes
        }
    }

    exportCSV() {
        if (this.records.length === 0) {
            alert('没有数据可导出');
            return;
        }

        const headers = ['项目', '开始时间', '时长', '备注'];
        const rows = this.records.map(record => [
            record.project,
            new Date(record.date).toLocaleString('zh-CN'),
            this.formatDuration(record.duration),
            record.notes || ''
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        this.downloadFile('time-tracker-data.csv', csv, 'text/csv');
    }

    exportJSON() {
        if (this.records.length === 0) {
            alert('没有数据可导出');
            return;
        }

        const data = {
            records: this.records,
            projects: Array.from(this.projects),
            exportDate: new Date().toISOString()
        };

        const json = JSON.stringify(data, null, 2);
        this.downloadFile('time-tracker-data.json', json, 'application/json');
    }

    downloadFile(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize app
const app = new TimeTracker();