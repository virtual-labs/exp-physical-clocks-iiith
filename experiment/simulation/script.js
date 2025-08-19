        class NTPSimulation {
            constructor() {
                this.isRunning = false;
                this.serverTime = 0;
                this.clientTime = 1000;
                this.startTime = Date.now();
                this.packetsSent = 0;
                this.syncData = [];
                this.lastSyncTime = null;
                this.syncState = 'IDLE';
                this.currentOffset = 1000;
                this.currentRTT = 0;
                this.offsetHistory = [];
                this.rttHistory = [];
                
                this.initializeChart();
                this.bindEvents();
                this.updateDisplay();
                this.loadScenario();
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
                document.getElementById('scenario').addEventListener('change', () => {
                    this.loadScenario();
                });

                const params = ['rtt', 'rtt_variation', 'asymmetry', 'sim_speed', 'client_offset', 
                              'drift_rate', 'sync_interval', 'sync_period', 'packet_interval', 
                              'server_error', 'server_delay'];
                
                params.forEach(param => {
                    const input = document.getElementById(param);
                    const display = document.getElementById(param + '-display');
                    
                    input.addEventListener('input', () => {
                        display.textContent = input.value;
                        if (param === 'client_offset') {
                            this.clientTime = this.serverTime + parseInt(input.value);
                            this.currentOffset = parseInt(input.value);
                        }
                    });
                });

                // Control buttons
                document.getElementById('startBtn').addEventListener('click', () => this.start());
                document.getElementById('stopBtn').addEventListener('click', () => this.stop());
                document.getElementById('syncBtn').addEventListener('click', () => this.synchronizeNow());
                document.getElementById('packetBtn').addEventListener('click', () => this.sendPacket());
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

            start() {
                if (this.isRunning) return;
                this.isRunning = true;
                this.startTime = Date.now();
                this.log('Simulation started', 'success');
                this.syncState = 'RUNNING';
                this.updateDisplay();
                this.simulationLoop();
                this.syncLoop();
            }

            stop() {
                this.isRunning = false;
                this.syncState = 'STOPPED';
                this.log('Simulation stopped', 'warning');
                this.updateDisplay();
            }

            simulationLoop() {
                if (!this.isRunning) return;

                const now = Date.now();
                const elapsed = now - this.startTime;
                const simSpeed = parseInt(document.getElementById('sim_speed').value);
                
                // Update server time (reference time) with small random error
                const serverError = parseInt(document.getElementById('server_error').value);
                this.serverTime = elapsed * (simSpeed / 100) + (Math.random() - 0.5) * serverError;
                
                // Update client time with realistic drift
                const driftRate = parseInt(document.getElementById('drift_rate').value);
                const timeDelta = (simSpeed / 100) * 100; // 100ms intervals adjusted by sim speed
                const driftAdjustment = (driftRate / 1000000) * timeDelta; // ppm conversion
                this.clientTime += timeDelta + driftAdjustment;
                
                this.updateDisplay();
                setTimeout(() => this.simulationLoop(), 100);
            }

            syncLoop() {
                if (!this.isRunning) return;

                const syncInterval = parseInt(document.getElementById('sync_interval').value);
                this.performSynchronization();
                
                setTimeout(() => this.syncLoop(), syncInterval);
            }

            synchronizeNow() {
                this.log('Manual synchronization initiated', 'info');
                this.performSynchronization();
            }

            performSynchronization() {
                const syncPeriod = parseInt(document.getElementById('sync_period').value);
                const packetInterval = parseInt(document.getElementById('packet_interval').value);
                
                this.syncState = 'SYNCHRONIZING';
                this.log(`Starting synchronization process (${syncPeriod}ms)`, 'info');
                
                let packetsToSend = Math.floor(syncPeriod / packetInterval);
                let packetsSent = 0;
                
                const sendNextPacket = () => {
                    if (packetsSent < packetsToSend && this.isRunning) {
                        this.sendPacket();
                        packetsSent++;
                        setTimeout(sendNextPacket, packetInterval);
                    } else {
                        this.syncState = this.isRunning ? 'RUNNING' : 'STOPPED';
                        this.log('Synchronization process completed', 'success');
                        this.lastSyncTime = new Date().toLocaleTimeString();
                        this.updateDisplay();
                    }
                };
                
                sendNextPacket();
            }

            sendPacket() {
                // NTP packet exchange simulation
                const rtt = parseInt(document.getElementById('rtt').value);
                const rttVariation = parseInt(document.getElementById('rtt_variation').value);
                const asymmetry = parseInt(document.getElementById('asymmetry').value);
                const serverDelay = parseInt(document.getElementById('server_delay').value);
                
                // Calculate actual RTT with variation and asymmetry
                const actualRTT = rtt + (Math.random() - 0.5) * rttVariation * 2;
                const asymmetryOffset = (Math.random() - 0.5) * asymmetry * 2;
                
                // Calculate forward and backward delays (asymmetric)
                const forwardDelay = (actualRTT / 2) + asymmetryOffset;
                const backwardDelay = (actualRTT / 2) - asymmetryOffset;
                
                // Correct NTP timestamps simulation
                const t0 = this.clientTime; // Client originate timestamp
                const t1 = this.serverTime; // Server receive timestamp (server time when receiving)
                const t2 = t1 + serverDelay; // Server transmit timestamp (server time when transmitting)
                const t3 = this.clientTime + forwardDelay + serverDelay + backwardDelay; // Client receive timestamp
                
                // Standard NTP offset and delay calculations
                const offset = ((t1 - t0) + (t2 - t3)) / 2;
                const delay = (t3 - t0) - (t2 - t1);
                
                // Apply NTP-like clock adjustment (with damping factor)
                const dampingFactor = 0.125; // Standard NTP damping (1/8)
                this.clientTime -= offset * dampingFactor;
                this.currentOffset = this.clientTime - this.serverTime;
                this.currentRTT = delay;
                
                // Store data for chart
                this.syncData.push({ rtt: actualRTT, offset: Math.abs(this.currentOffset) });
                if (this.syncData.length > 100) {
                    this.syncData.shift();
                }
                
                // Update statistics
                this.offsetHistory.push(Math.abs(this.currentOffset));
                this.rttHistory.push(actualRTT);
                if (this.offsetHistory.length > 50) {
                    this.offsetHistory.shift();
                    this.rttHistory.shift();
                }
                
                this.packetsSent++;
                this.log(`NTP Exchange - Delay: ${delay.toFixed(1)}ms, Offset: ${offset.toFixed(1)}ms, Adjustment: ${(offset * dampingFactor).toFixed(1)}ms`, 'info');
                
                // Animate packet
                this.animatePacket();
                
                // Update chart
                this.drawChart();
                this.updateDisplay();
            }

            animatePacket() {
                const packet = document.getElementById('packet');
                
                // Animate request packet (client to server)
                packet.style.display = 'block';
                packet.style.background = '#f6ad55';
                packet.classList.remove('reverse');
                packet.style.animation = 'packetMove 1s ease-in-out';
                
                // Animate response packet (server to client)
                setTimeout(() => {
                    packet.style.background = '#48bb78';
                    packet.classList.add('reverse');
                    packet.style.animation = 'packetMoveReverse 1s ease-in-out';
                }, 500);
                
                setTimeout(() => {
                    packet.style.display = 'none';
                    packet.style.animation = 'none';
                    packet.classList.remove('reverse');
                }, 1500);
            }

            clearChart() {
                this.syncData = [];
                this.offsetHistory = [];
                this.rttHistory = [];
                this.drawChart();
                this.log('Chart cleared', 'info');
            }

            drawChart() {
                const { canvas, ctx } = this.chart;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (this.syncData.length === 0) {
                    ctx.fillStyle = '#a0aec0';
                    ctx.font = '16px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('No data to display', canvas.width/2, canvas.height/2);
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
                
                const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                
                return { slope, intercept };
            }

            calculateStatistics() {
                if (this.offsetHistory.length === 0) return { avg: 0, stdDev: 0, accuracy: 0, jitter: 0 };
                
                // Calculate average absolute offset
                const avgOffset = this.offsetHistory.reduce((sum, val) => sum + val, 0) / this.offsetHistory.length;
                
                // Calculate standard deviation of offset
                const offsetVariance = this.offsetHistory.reduce((sum, val) => sum + Math.pow(val - avgOffset, 2), 0) / this.offsetHistory.length;
                const stdDev = Math.sqrt(offsetVariance);
                
                // Calculate sync accuracy as percentage (lower offset = higher accuracy)
                // Using exponential decay: accuracy = 100 * e^(-offset/100)
                const accuracy = Math.min(100, 100 * Math.exp(-avgOffset / 100));
                
                // Calculate network jitter (RTT standard deviation)
                if (this.rttHistory.length === 0) return { avg: avgOffset, stdDev, accuracy, jitter: 0 };
                
                const avgRTT = this.rttHistory.reduce((sum, val) => sum + val, 0) / this.rttHistory.length;
                const rttVariance = this.rttHistory.reduce((sum, val) => sum + Math.pow(val - avgRTT, 2), 0) / this.rttHistory.length;
                const jitter = Math.sqrt(rttVariance);
                
                return {
                    avg: avgOffset,
                    stdDev: stdDev,
                    accuracy: Math.max(0, accuracy),
                    jitter: jitter
                };
            }

            updateDisplay() {
                // Update clocks
                const serverTimeStr = this.formatTime(this.serverTime);
                const clientTimeStr = this.formatTime(this.clientTime);
                
                document.getElementById('serverTime').textContent = serverTimeStr;
                document.getElementById('clientTime').textContent = clientTimeStr;
                
                // Update info displays
                document.getElementById('serverErrorDisplay').textContent = 
                    document.getElementById('server_error').value + 'ms';
                document.getElementById('clientOffsetDisplay').textContent = 
                    this.currentOffset.toFixed(1) + 'ms';
                document.getElementById('clientDriftDisplay').textContent = 
                    document.getElementById('drift_rate').value + 'ppm';
                
                // Update status panel
                document.getElementById('currentOffset').textContent = this.currentOffset.toFixed(1) + ' ms';
                document.getElementById('roundTripDelay').textContent = this.currentRTT.toFixed(1) + ' ms';
                document.getElementById('syncState').textContent = this.syncState;
                document.getElementById('packetsSent').textContent = this.packetsSent;
                document.getElementById('lastSync').textContent = this.lastSyncTime || 'Never';
                
                // Update header status indicator based on sync state
                const statusIndicator = document.querySelector('.status-indicator');
                if (this.syncState === 'SYNCHRONIZING') {
                    statusIndicator.style.background = '#f6ad55';
                    statusIndicator.style.animationDuration = '0.5s';
                } else if (this.syncState === 'RUNNING') {
                    statusIndicator.style.background = '#48bb78';
                    statusIndicator.style.animationDuration = '2s';
                } else {
                    statusIndicator.style.background = '#718096';
                    statusIndicator.style.animationDuration = '3s';
                }
                
                // Update metrics
                const stats = this.calculateStatistics();
                document.getElementById('avgOffset').textContent = stats.avg.toFixed(1) + ' ms';
                document.getElementById('offsetStdDev').textContent = stats.stdDev.toFixed(1) + ' ms';
                document.getElementById('syncAccuracy').textContent = stats.accuracy.toFixed(1) + '%';
                document.getElementById('networkJitter').textContent = stats.jitter.toFixed(1) + ' ms';
            }

            formatTime(timestamp) {
                const date = new Date(timestamp);
                const hours = date.getUTCHours().toString().padStart(2, '0');
                const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                const seconds = date.getUTCSeconds().toString().padStart(2, '0');
                const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');
                return `${hours}:${minutes}:${seconds}.${milliseconds}`;
            }

            log(message, type = 'info') {
                const logContainer = document.getElementById('logContainer');
                const timestamp = new Date().toLocaleTimeString();
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry log-${type}`;
                logEntry.textContent = `[${timestamp}] ${message}`;
                
                logContainer.appendChild(logEntry);
                logContainer.scrollTop = logContainer.scrollHeight;
                
                // Keep only last 50 log entries
                while (logContainer.children.length > 52) { // 50 + 2 existing entries
                    if (logContainer.children[0].textContent.includes('[INFO] NTP Simulation initialized') ||
                        logContainer.children[0].textContent.includes('[INFO] Ready to start synchronization')) {
                        // Don't remove existing entries
                        break;
                    }
                    logContainer.removeChild(logContainer.children[2]); // Remove after initial entries
                }
            }
        }

        // Initialize simulation when page loads
        window.addEventListener('load', () => {
            ntpSimulation = new NTPSimulation();
        });

        // Handle window resize for chart
        let ntpSimulation;
        
        window.addEventListener('resize', () => {
            setTimeout(() => {
                const canvas = document.getElementById('syncChart');
                if (canvas && ntpSimulation) {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                    ntpSimulation.drawChart();
                }
            }, 100);
        });

        // Mobile orientation handling
        function checkOrientation() {
            const overlay = document.querySelector('.rotate-device-overlay');
            const isMobile = window.innerWidth < 768;
            const isPortrait = window.innerHeight > window.innerWidth;
            
            if (isMobile && isPortrait) {
                overlay.style.display = 'flex';
            } else {
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
                    if (ntpSimulation) {
                        if (ntpSimulation.isRunning) {
                            ntpSimulation.stop();
                        } else {
                            ntpSimulation.start();
                        }
                    }
                }
                else if (e.key === 's' || e.key === 'S') { // S for sync
                    e.preventDefault();
                    if (ntpSimulation) ntpSimulation.synchronizeNow();
                }
                else if (e.key === 'p' || e.key === 'P') { // P for packet
                    e.preventDefault();
                    if (ntpSimulation) ntpSimulation.sendPacket();
                }
                else if (e.key === 'c' || e.key === 'C') { // C for clear
                    e.preventDefault();
                    if (ntpSimulation) ntpSimulation.clearChart();
                }
            }
        });

        // Click outside modal to close
        document.getElementById('infoModal').addEventListener('click', (e) => {
            if (e.target.id === 'infoModal') {
                hideInfo();
            }
        });