class PeerSyncSimulation {
    constructor() {
        this.isRunning = false;
        this.mode = 'automatic'; // 'automatic' or 'manual'
        this.peer1Time = 0;
        this.peer2Time = 1000;
        this.startTime = Date.now();
        this.packetsSent = 0;
        this.syncData = [];
        this.lastSyncTime = null;
        this.syncState = 'IDLE';
        this.currentOffset = 1000;
        this.currentRTT = 0;
        this.offsetHistory = [];
        this.peer1SlowingDown = false;
        this.peer2SlowingDown = false;
        this.syncLoopTimeout = null;

        this.initializeChart();
        this.bindEvents();
        this.updateDisplay();
        this.loadScenario();
        this.setMode(this.mode);
    }

    initializeChart() {
        const canvas = document.getElementById('syncChart');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        this.chart = { canvas, ctx };
        this.drawChart();
    }

    bindEvents() {
        document.getElementById('autoModeBtn').addEventListener('click', () => this.setMode('automatic'));
        document.getElementById('manualModeBtn').addEventListener('click', () => this.setMode('manual'));

        document.getElementById('scenario').addEventListener('change', () => {
            this.loadScenario();
        });

        const params = ['rtt', 'rtt_variation', 'asymmetry', 'sim_speed', 'peer2_offset',
            'peer1_drift', 'peer2_drift', 'sync_interval'];

        params.forEach(param => {
            const input = document.getElementById(param);
            const display = document.getElementById(param + '-display');

            input.addEventListener('input', () => {
                if (display) display.textContent = input.value;
                if (param === 'peer2_offset') {
                    if (!this.isRunning) {
                        this.peer2Time = this.peer1Time + parseInt(input.value);
                        this.currentOffset = parseInt(input.value);
                        this.updateDisplay();
                    }
                }
            });
        });

        // Control buttons
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('syncBtn').addEventListener('click', () => this.synchronizeNow());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearChart());
    }

    loadScenario() {
        const scenario = document.getElementById('scenario').value;
        const scenarios = {
            'lan': { rtt: 5, rtt_variation: 1, asymmetry: 0 },
            'lan_noisy': { rtt: 8, rtt_variation: 3, asymmetry: 1 },
            'lan_asymmetric': { rtt: 10, rtt_variation: 2, asymmetry: 5 },
            'man_noisy': { rtt: 25, rtt_variation: 8, asymmetry: 3 },
            'man_asymmetric': { rtt: 30, rtt_variation: 5, asymmetry: 10 },
            'wan_noisy': { rtt: 80, rtt_variation: 20, asymmetry: 5 },
            'wan_asymmetric': { rtt: 100, rtt_variation: 15, asymmetry: 25 },
            'global_noisy': { rtt: 200, rtt_variation: 50, asymmetry: 10 },
            'global_asymmetric': { rtt: 250, rtt_variation: 30, asymmetry: 50 },
            'custom': null
        };

        if (scenarios[scenario]) {
            const config = scenarios[scenario];
            document.getElementById('rtt').value = config.rtt;
            document.getElementById('rtt_variation').value = config.rtt_variation;
            document.getElementById('asymmetry').value = config.asymmetry;

            // Update displays
            document.getElementById('rtt-display').textContent = config.rtt;
            document.getElementById('rtt_variation-display').textContent = config.rtt_variation;
            document.getElementById('asymmetry-display').textContent = config.asymmetry;
        }
    }

    setMode(mode) {
        this.mode = mode;
        this.log(`Mode switched to ${mode}`, 'info');

        const autoBtn = document.getElementById('autoModeBtn');
        const manualBtn = document.getElementById('manualModeBtn');
        const syncBtn = document.getElementById('syncBtn');

        if (mode === 'automatic') {
            autoBtn.classList.add('active');
            manualBtn.classList.remove('active');
            syncBtn.style.display = 'none';
            if (this.isRunning) {
                this.syncLoop();
            }
        } else { // manual mode
            autoBtn.classList.remove('active');
            manualBtn.classList.add('active');
            syncBtn.style.display = 'flex';
            if (this.syncLoopTimeout) {
                clearTimeout(this.syncLoopTimeout);
                this.syncLoopTimeout = null;
            }
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startTime = Date.now();
        this.lastLoopTime = this.startTime;

        const peer2Offset = Number(document.getElementById('peer2_offset')?.value) || 0;
        this.peer1Time = 0;
        this.peer2Time = peer2Offset;
        this.currentOffset = peer2Offset;

        this.log('Simulation started', 'success');
        this.syncState = 'RUNNING';
        this.updateDisplay();
        this.simulationLoop();
        if (this.mode === 'automatic') {
            this.syncLoop();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.syncLoopTimeout) {
            clearTimeout(this.syncLoopTimeout);
            this.syncLoopTimeout = null;
        }
        this.syncState = 'STOPPED';
        this.log('Simulation stopped', 'warning');
        this.updateDisplay();
    }

    simulationLoop() {
        if (!this.isRunning) return;

        const now = Date.now();
        const simSpeed = parseInt(document.getElementById('sim_speed').value);
        const timeSinceLastLoop = (now - this.lastLoopTime) * (simSpeed / 100);

        const peer1DriftRate = Number(document.getElementById('peer1_drift').value);
        const peer2DriftRate = Number(document.getElementById('peer2_drift').value);

        let peer1TimeDelta = timeSinceLastLoop;
        let peer2TimeDelta = timeSinceLastLoop;

        // Apply drift
        peer1TimeDelta += (peer1DriftRate / 1000000) * timeSinceLastLoop;
        peer2TimeDelta += (peer2DriftRate / 1000000) * timeSinceLastLoop;

        // Apply slowdown if active
        if (this.peer1SlowingDown) peer1TimeDelta *= 0.9;
        if (this.peer2SlowingDown) peer2TimeDelta *= 0.9;

        this.peer1Time += peer1TimeDelta;
        this.peer2Time += peer2TimeDelta;

        this.lastLoopTime = now;
        this.currentOffset = this.peer2Time - this.peer1Time;

        // Check if slowdown should stop
        if (this.peer1SlowingDown && this.peer1Time <= this.peer2Time) {
            this.peer1SlowingDown = false;
            this.log('Peer 1 clock slowdown finished.', 'info');
        }
        if (this.peer2SlowingDown && this.peer2Time <= this.peer1Time) {
            this.peer2SlowingDown = false;
            this.log('Peer 2 clock slowdown finished.', 'info');
        }

        this.updateDisplay();
        setTimeout(() => this.simulationLoop(), 100);
    }

    syncLoop() {
        if (!this.isRunning || this.mode !== 'automatic') return;

        const syncInterval = parseInt(document.getElementById('sync_interval').value);
        this.synchronizeNow();

        this.syncLoopTimeout = setTimeout(() => this.syncLoop(), syncInterval);
    }

    synchronizeNow() {
        this.log('Synchronization initiated', 'info');
        this.performSynchronization();
    }

    async performSynchronization() {
        this.syncState = 'SYNCHRONIZING';
        this.log('Exchanging packets to measure offset...', 'info');

        const packetCount = 8; // Send a burst of 8 packets
        const packetInterval = 100;
        let measurements = [];

        for (let i = 0; i < packetCount; i++) {
            const measurement = await this.sendPacket();
            measurements.push(measurement);
            await new Promise(resolve => setTimeout(resolve, packetInterval));
        }

        // Find the best measurement (lowest RTT)
        if (measurements.length > 0) {
            measurements.sort((a, b) => a.delay - b.delay);
            const bestMeasurement = measurements[0];
            const offset = bestMeasurement.offset;

            this.log(`Best measurement: RTT=${bestMeasurement.delay.toFixed(1)}ms, Offset=${offset.toFixed(1)}ms`, 'success');

            // Apply clock slowdown
            if (offset > 1) { // Peer 2 is faster
                this.peer2SlowingDown = true;
                this.peer1SlowingDown = false;
                this.showSlowdownPopup('Peer 2 is faster, slowing it down...');
                this.log('Peer 2 is faster, slowing down its clock.', 'warning');
            } else if (offset < -1) { // Peer 1 is faster
                this.peer1SlowingDown = true;
                this.peer2SlowingDown = false;
                this.showSlowdownPopup('Peer 1 is faster, slowing it down...');
                this.log('Peer 1 is faster, slowing down its clock.', 'warning');
            } else {
                this.log('Peers are closely synchronized.', 'info');
            }
        }

        this.syncState = this.isRunning ? 'RUNNING' : 'STOPPED';
        this.lastSyncTime = new Date().toLocaleTimeString();
        this.updateDisplay();
    }

    sendPacket() {
        return new Promise(resolve => {
            const rtt = Number(document.getElementById('rtt').value);
            const rttVariation = Number(document.getElementById('rtt_variation').value);
            const asymmetry = Number(document.getElementById('asymmetry').value);

            let actualRTT = Math.max(0.1, rtt + (Math.random() - 0.5) * rttVariation * 2);
            let asymmetryOffset = (Math.random() - 0.5) * asymmetry * 2;
            const maxAsym = Math.max(0, actualRTT / 2 - 0.05);
            if (Math.abs(asymmetryOffset) > maxAsym) {
                asymmetryOffset = Math.sign(asymmetryOffset) * maxAsym;
            }

            const forwardDelay = Math.max(0, (actualRTT / 2) + asymmetryOffset);
            const backwardDelay = Math.max(0, actualRTT - forwardDelay);

            // Peer 1 sends to Peer 2
            const t0 = this.peer1Time;
            const t1 = this.peer2Time + forwardDelay;
            const t2 = t1; // No processing delay in this model
            const t3 = t0 + actualRTT;

            const offset = ((t1 - t0) + (t2 - t3)) / 2;
            const delay = (t3 - t0) - (t2 - t1);

            this.packetsSent++;
            this.currentRTT = delay;

            const absOffset = Math.abs(this.peer2Time - this.peer1Time);
            this.syncData.push({ rtt: actualRTT, offset: absOffset });
            if (this.syncData.length > 100) this.syncData.shift();

            this.offsetHistory.push(absOffset);
            if (this.offsetHistory.length > 50) this.offsetHistory.shift();

            this.animatePacket(false);
            this.drawChart();
            this.updateDisplay();

            resolve({ offset, delay });
        });
    }

    animatePacket(isReverse) {
        const packet = document.getElementById('packet');
        if (!packet) return;
        packet.style.display = 'block';
        packet.classList.toggle('reverse', isReverse);
        packet.style.animation = 'none';
        void packet.offsetWidth; // Trigger reflow
        packet.style.animation = isReverse ? 'packetMoveReverse 1s ease-in-out' : 'packetMove 1s ease-in-out';

        setTimeout(() => {
            this.animatePacket(!isReverse);
        }, 1000);

        setTimeout(() => {
            packet.style.display = 'none';
        }, 2000);
    }

    clearChart() {
        this.syncData = [];
        this.offsetHistory = [];
        this.drawChart();
        this.log('Chart cleared', 'info');
    }

    drawChart() {
        const { canvas, ctx } = this.chart;
        if (!canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.syncData.length === 0) {
            ctx.fillStyle = '#a0aec0';
            ctx.font = '16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Draw axes
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, 30);
        ctx.lineTo(50, canvas.height - 30);
        ctx.lineTo(canvas.width - 30, canvas.height - 30);
        ctx.stroke();

        // Find data ranges
        const maxRTT = Math.max(...this.syncData.map(d => d.rtt));
        const maxOffset = Math.max(...this.syncData.map(d => d.offset));
        const minRTT = Math.min(...this.syncData.map(d => d.rtt));
        const minOffset = Math.min(...this.syncData.map(d => d.offset));

        // Draw grid
        ctx.strokeStyle = '#f7fafc';
        ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) {
            const x = 50 + (canvas.width - 80) * i / 10;
            const y = 30 + (canvas.height - 60) * i / 10;

            ctx.beginPath();
            ctx.moveTo(x, 30);
            ctx.lineTo(x, canvas.height - 30);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(50, y);
            ctx.lineTo(canvas.width - 30, y);
            ctx.stroke();
        }

        // Draw data points
        ctx.fillStyle = '#4299e1';
        ctx.strokeStyle = '#3182ce';
        ctx.lineWidth = 2;
        this.syncData.forEach((point, index) => {
            const x = 50 + (canvas.width - 80) * (point.rtt - minRTT) / (maxRTT - minRTT || 1);
            const y = canvas.height - 30 - (canvas.height - 60) * (point.offset - minOffset) / (maxOffset - minOffset || 1);

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });

        // Draw trend line if enough data
        if (this.syncData.length > 5) {
            const regression = this.calculateLinearRegression();
            ctx.strokeStyle = '#f56565';
            ctx.lineWidth = 3;
            ctx.beginPath();

            const startX = 50;
            const endX = canvas.width - 30;
            const startRTT = minRTT;
            const endRTT = maxRTT;
            const startY = canvas.height - 30 - (canvas.height - 60) *
                ((regression.slope * startRTT + regression.intercept - minOffset) / (maxOffset - minOffset || 1));
            const endY = canvas.height - 30 - (canvas.height - 60) *
                ((regression.slope * endRTT + regression.intercept - minOffset) / (maxOffset - minOffset || 1));

            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        // Draw axis labels
        ctx.fillStyle = '#4a5568';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';

        // X-axis labels
        for (let i = 0; i <= 5; i++) {
            const x = 50 + (canvas.width - 80) * i / 5;
            const value = minRTT + (maxRTT - minRTT) * i / 5;
            ctx.fillText(value.toFixed(0), x, canvas.height - 10);
        }

        // Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = canvas.height - 30 - (canvas.height - 60) * i / 5;
            const value = minOffset + (maxOffset - minOffset) * i / 5;
            ctx.fillText(value.toFixed(0), 45, y + 4);
        }

        // Add axis titles
        ctx.fillStyle = '#2d3748';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Round-Trip Time (ms)', canvas.width / 2, canvas.height - 5);

        ctx.save();
        ctx.translate(15, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Sync Error (ms)', 0, 0);
        ctx.restore();
    }

    calculateLinearRegression() {
        const n = this.syncData.length;
        const sumX = this.syncData.reduce((sum, d) => sum + d.rtt, 0);
        const sumY = this.syncData.reduce((sum, d) => sum + d.offset, 0);
        const sumXY = this.syncData.reduce((sum, d) => sum + d.rtt * d.offset, 0);
        const sumXX = this.syncData.reduce((sum, d) => sum + d.rtt * d.rtt, 0);
        const denom = (n * sumXX - sumX * sumX);
        let slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
        if (!Number.isFinite(slope)) slope = 0;
        let intercept = (sumY - slope * sumX) / n;
        if (!Number.isFinite(intercept)) intercept = 0;
        return { slope, intercept };
    }

    calculateStatistics() {
        if (this.offsetHistory.length === 0) return { avg: 0 };

        const avgOffset = this.offsetHistory.reduce((sum, val) => sum + val, 0) / this.offsetHistory.length;

        return {
            avg: Number.isFinite(avgOffset) ? avgOffset : 0,
        };
    }

    updateDisplay() {
        document.getElementById('peer1Time').textContent = this.formatTime(this.peer1Time);
        document.getElementById('peer2Time').textContent = this.formatTime(this.peer2Time);

        document.getElementById('peer1DriftDisplay').textContent = document.getElementById('peer1_drift').value + 'ppm';
        document.getElementById('peer2DriftDisplay').textContent = document.getElementById('peer2_drift').value + 'ppm';

        document.getElementById('peer1Status').textContent = this.peer1SlowingDown ? 'Slowing Down' : 'Normal';
        document.getElementById('peer2Status').textContent = this.peer2SlowingDown ? 'Slowing Down' : 'Normal';

        document.getElementById('currentOffset').textContent = this.currentOffset.toFixed(1) + ' ms';
        document.getElementById('roundTripDelay').textContent = this.currentRTT.toFixed(1) + ' ms';
        document.getElementById('syncState').textContent = this.syncState;
        document.getElementById('packetsSent').textContent = this.packetsSent;
        document.getElementById('lastSync').textContent = this.lastSyncTime || 'Never';

        const stats = this.calculateStatistics();
        document.getElementById('avgOffset').textContent = stats.avg.toFixed(1) + ' ms';

        const statusIndicator = document.querySelector('.status-indicator');
        if (this.syncState === 'SYNCHRONIZING') {
            statusIndicator.style.background = '#f6ad55';
        } else if (this.isRunning) {
            statusIndicator.style.background = '#48bb78';
        } else {
            statusIndicator.style.background = '#718096';
        }
    }

    formatTime(timestamp) {
        const t = Math.max(0, Number(timestamp) || 0);
        const hours = Math.floor(t / 3600000) % 24;
        const minutes = Math.floor((t % 3600000) / 60000);
        const seconds = Math.floor((t % 60000) / 1000);
        const milliseconds = Math.floor(t % 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }

    log(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    showSlowdownPopup(message) {
        const popup = document.getElementById('slowdownPopup');
        popup.textContent = message;
        popup.classList.add('show');
        setTimeout(() => {
            popup.classList.remove('show');
        }, 3000);
    }
}

window.addEventListener('load', () => {
    peerSim = new PeerSyncSimulation();
});

// Handle window resize for chart
let peerSim;

window.addEventListener('resize', () => {
    setTimeout(() => {
        const canvas = document.getElementById('syncChart');
        if (canvas && peerSim) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            peerSim.drawChart();
        }
    }, 100);
});

// Mobile orientation handling - now just hides the overlay since we support portrait mode
function checkOrientation() {
    const overlay = document.querySelector('.rotate-device-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Check orientation on load and resize
window.addEventListener('load', checkOrientation);
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => {
    setTimeout(checkOrientation, 100);
});

// Info Modal Functions
function showInfo() {
    document.getElementById('infoModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideInfo() {
    document.getElementById('infoModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Make functions globally accessible
window.showInfo = showInfo;
window.hideInfo = hideInfo;

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // F1 or Ctrl+H for help
    if (e.key === 'F1' || (e.ctrlKey && e.key === 'h')) {
        e.preventDefault();
        showInfo();
    }
    // Escape to close modal
    else if (e.key === 'Escape') {
        hideInfo();
    }
    // Only allow other shortcuts when modal is not open
    else if (document.getElementById('infoModal').style.display !== 'flex') {
        if (e.key === ' ') { // Space to start/stop
            e.preventDefault();
            if (peerSim) {
                if (peerSim.isRunning) {
                    peerSim.stop();
                } else {
                    peerSim.start();
                }
            }
        }
        else if (e.key === 's' || e.key === 'S') { // S for sync
            e.preventDefault();
            if (peerSim) peerSim.synchronizeNow();
        }
        else if (e.key === 'c' || e.key === 'C') { // C for clear
            e.preventDefault();
            if (peerSim) peerSim.clearChart();
        }
    }
});

// Click outside modal to close
document.getElementById('infoModal').addEventListener('click', (e) => {
    if (e.target.id === 'infoModal') {
        hideInfo();
    }
});