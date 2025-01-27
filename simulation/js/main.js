// CONSTANTS
// ---------

const SIMULATION        = document.querySelector('#simulation canvas');
const CONTROLS          = document.querySelector('#controls form');
const START_SIMULATION  = document.querySelector('#start-simulation');
const STOP_SIMILATION   = document.querySelector('#stop-simulation');
const SELECT_EXPERIMENT = document.querySelector('#select-experiment');
const PLOT_OFFSET       = document.querySelector('#plot-offset');
const START_AUDIO       = document.querySelector('#start-audio');
const STOP_AUDIO        = document.querySelector('#stop-audio');
const PAUSE_AUDIO       = document.querySelector('#pause-audio');
const ADJUST_AUDIO      = document.querySelector('#adjust-audio');
const SYNCHRONIZE_AUDIO = document.querySelector('#synchronize-audio');
const BACKGROUND_IMG    = './images/background.jpeg';
const PACKET_IMG        = './images/packet-64.png';




// PARAMETERS
// ----------

/** Default parameters for the simulation. */
const PARAMETERS = {
  // Network and Simulation Parameters.
  networkTrip: 100,
  networkAsymmetry: 20,
  networkTripVariation: 20,
  simulationSpeed: 10,
  // NTP Client Parameters.
  clientOffset: 10,
  clientDriftRate: 100000,
  clientSyncInterval: 1000,
  clientSyncPeriod: 100,
  clientPacketInterval: 10,
  // NTP Server Parameters.
  serverError: 0,
  serverResponseDelay: 10,
};




// STATE
// -----

/** Parameters for the simulation. */
var parameters = Object.assign({}, PARAMETERS);

/** State of the simulation. */
var simulation = {
  isRunning: true,
  isPaused:  false,
  isResumed: true,
  timestamp: 0,
  time: 0,
  clientTime: PARAMETERS.clientOffset,
  clientError: 0,
  lastSyncTime:   -PARAMETERS.clientSyncInterval * 0.9,
  lastPacketTime: -PARAMETERS.clientPacketInterval,
  clientSent: 0,
  serverSent: 0,
  clientRecieved: 0,
  serverRecieved: 0,
  clientSyncs: 0,
};

/** Packets in the simulation. */
var packets = [];

/** Records of round trip time and time offset. */
var records = [];

/** Plot of time offset vs round trip time. */
var plot = null;

/** Images for the simulation. */
var images  = {
  isLoaded: false,
  background: null,
  packet:     null,
};




// METHODS
// -------

/** Main function. */
function main() {
  Chart.register(ChartDataLabels);  // Enable chart data labels
  CONTROLS.addEventListener('submit', onControls);
  setTimeout(stopSimulation, 500);  // Let some rendering happen
  requestAnimationFrame(simulationLoop);
  drawButtons();
  drawPlot();
}
main();


/** Main simulation loop. */
function simulationLoop(timestamp) {
  var s = simulation;
  if (!s.isRunning || s.isPaused) return;
  if (s.isResumed) {
    s.timestamp = timestamp;
    s.isResumed = false;
  }
  else updateSimulation(timestamp);
  renderSimulation();
  requestAnimationFrame(simulationLoop);
}


/** Update the simulation. */
function updateSimulation(timestamp) {
  var s = simulation;
  var p = parameters;
  // Update the simulation time.
  var dt      = 0.001 * p.simulationSpeed * (timestamp - s.timestamp);
  s.timestamp = timestamp;
  s.time       += dt;
  s.clientTime += dt + 1e-6 * p.clientDriftRate * dt;
  // Process packets in the simulation.
  for (var m of packets) {
    if (s.time >= m.serverRecieveTime && !m.hasServerRecieved) {
      m.hasServerRecieved = true;
      ++s.serverRecieved;
    }
    if (s.time >= m.serverSendTime    && !m.hasServerSent) {
      m.hasServerSent = true;
      ++s.serverSent;
    }
    if (s.time >= m.clientRecieveTime && !m.hasClientRecieved) {
      m.clientRecordedRecieveTime = s.clientTime;
      m.hasClientRecieved = true;
      ++s.clientRecieved;
    }
  }
  // Send packets from the client to the server, if necessary.
  if (s.clientTime >= s.lastSyncTime   + p.clientSyncInterval &&
      s.clientTime <  s.lastSyncTime   + p.clientSyncInterval + p.clientSyncPeriod &&
      s.clientTime >= s.lastPacketTime + p.clientPacketInterval) {
    packets.push(createPacket(++s.clientSent, s.time, s.clientTime));
    s.lastPacketTime = s.clientTime;
  }
  // Sync the client with the server, if necessary.
  if (s.clientTime >= s.lastSyncTime + p.clientSyncInterval + p.clientSyncPeriod
      && s.clientSent === s.clientRecieved) {
    syncClient();
    s.lastSyncTime = s.clientTime;
    ++s.clientSyncs;
  }
}


/** Reset the simulation. */
function resetSimulation() {
  var s = simulation;
  var p = parameters;
  s.isRunning = false;
  s.isPaused  = false;
  s.isResumed = true;
  s.timestamp   = 0;
  s.time        = 0;
  s.clientTime  = p.clientOffset;
  s.clientError = 0;
  s.lastSyncTime   = -p.clientSyncInterval + p.clientSyncPeriod;
  s.lastPacketTime = -p.clientPacketInterval;
  s.clientSent = 0;
  s.serverSent = 0;
  s.clientRecieved = 0;
  s.serverRecieved = 0;
  s.clientSyncs = 0;
  packets = [];
}


/** Render the simulation. */
function renderSimulation() {
  var i = images;
  if (!i.isLoaded) loadImages();
  var ctx  = SIMULATION.getContext('2d');
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  drawBackground(ctx);
  drawClientStatus(ctx);
  drawServerStatus(ctx);
  drawPackets(ctx);
}


/** Sync the client with the server. */
function syncClient() {
  var s = simulation;
  var p = parameters;
  var entries = [];
  // Get details from packets that have been recieved.
  for (var i=0, j=0; i<packets.length; ++i) {
    var m = packets[i];
    packets[j] = m;  // Remove processed packets.
    var isRecieved = s.time >= m.clientRecieveTime;
    if (!isRecieved) { ++j; continue; }
    var t0 = m.clientRecordedSendTime;
    var t1 = m.serverRecieveTime;
    var t2 = m.serverSendTime;
    var t3 = m.clientRecordedRecieveTime;
    var roundTrip  = (t3 - t0)   - (t2 - t1);
    var timeOffset = (t1 + t2)/2 - (t0 + t3)/2;
    entries.push({roundTrip, timeOffset});
  }
  // Remove outliers.
  if (entries.length >= 5) {
    entries.sort((a, b) => a.timeOffset - b.timeOffset);
    entries = entries.slice(1, -1);
    entries.sort((a, b) => a.roundTrip - b.roundTrip);
    entries = entries.slice(1, -1);
  }
  // Calculate average round trip and time offset.
  var roundTrip  = 0;
  var timeOffset = 0;
  for (var m of entries) {
    roundTrip  += m.roundTrip;
    timeOffset += m.timeOffset;
  }
  roundTrip  /= entries.length;
  timeOffset /= entries.length;
  // Update the client time.
  s.clientTime  += timeOffset;
  s.clientError  = roundTrip/2 + p.serverError;
  // Record the round trip time and time offset.
  records.push({x: roundTrip, y: s.clientTime - s.time, syncId: s.clientSyncs});
  drawPlot();
}


/** Create a new packet. */
function createPacket(id, time, clientTime) {
  var p  = parameters;
  var rs = Math.random();
  var rt = Math.random() - 0.5;
  var ra = Math.random() - 0.5;
  var respPeriod = Math.max(rs*p.serverResponseDelay, 0);
  var tripPeriod = Math.max(p.networkTrip + rt*p.networkTripVariation, 0.1*p.networkTrip + respPeriod);
  var sendPeriod = Math.max((tripPeriod - respPeriod)/2 + ra*p.networkAsymmetry, 0.05*p.networkTrip);
  return {
    id: id,
    clientSendTime:    time,
    serverRecieveTime: time + sendPeriod,
    serverSendTime:    time + sendPeriod + respPeriod,
    clientRecieveTime: time + tripPeriod,
    clientRecordedSendTime: clientTime,
    clientRecordedRecieveTime: clientTime,
    hasServerRecieved: false,
    hasServerSent:     false,
    hasClientRecieved: false,
  };
}


/** Called when "Controls" form is submitted. */
function onControls(e) {
  e.preventDefault();
  return false;
}


/** Called when "Start Simulation" button is clicked. */
function onStartSimulation() {
  adjustParameters();
  var s = simulation;
  if (!s.isRunning) START_AUDIO.play();
  else PAUSE_AUDIO.play();
  s.isPaused  = s.isRunning? !s.isPaused : false;
  s.isResumed = !s.isPaused;
  s.isRunning = true;
  requestAnimationFrame(simulationLoop);
  drawButtons();
}


/** Called when "Stop Simulation" button is clicked. */
function onStopSimulation() {
  STOP_AUDIO.play();
  stopSimulation();
}


/** Stop the current simulation. */
function stopSimulation() {
  resetSimulation();
  renderSimulation();
  drawButtons();
}


/** Called when "Synchronize Now" button is clicked. */
function onSynchronize() {
  SYNCHRONIZE_AUDIO.play();
  var s = simulation;
  var p = parameters;
  // Force a sync by setting the last sync time to a time in the past.
  s.lastSyncTime   = s.clientTime - p.clientSyncInterval;
  s.lastPacketTime = s.clientTime - p.clientPacketInterval;
}


/** Called when "Send Packet" button is clicked. */
function onSendPacket() {
  var s = simulation;
  packets.push(createPacket(++s.clientSent, s.time, s.clientTime));
}


/** Called when an experiment is selected. */
function onSelectExperiment() {
  var p = parameters;
  ADJUST_AUDIO.play();
  switch (SELECT_EXPERIMENT.value) {
    case 'lan-x': Object.assign(p, defineParameters(11, 0, 0.1)); break;
    case 'lan-n': Object.assign(p, defineParameters(13, 0, 0.6)); break;
    case 'lan-a': Object.assign(p, defineParameters(11, 0.4, 0.1)); break;
    case 'man-n': Object.assign(p, defineParameters(65, 0, 0.6)); break;
    case 'man-a': Object.assign(p, defineParameters(55, 0.4, 0.1)); break;
    case 'wan-n': Object.assign(p, defineParameters(130, 0, 0.6)); break;
    case 'wan-a': Object.assign(p, defineParameters(110, 0.4, 0.1)); break;
    case 'gan-n': Object.assign(p, defineParameters(650, 0, 0.6)); break;
    case 'gan-a': Object.assign(p, defineParameters(550, 0.4, 0.1)); break;
    default: Object.assign(p, PARAMETERS); break;
  }
  stopSimulation();
  drawParameters();
}


/** Define parameters for the simulation. */
function defineParameters(trip, asymmetry, variation) {
  return {
    // Network and Simulation Parameters.
    networkTrip: trip,
    networkAsymmetry: asymmetry * trip,
    networkTripVariation: variation * trip,
    simulationSpeed: 0.1 * trip,
    // NTP Client Parameters.
    clientOffset: 0.4 * trip,
    clientDriftRate: 100000,
    clientSyncInterval: 2 * trip,
    clientSyncPeriod: trip,
    clientPacketInterval: 0.1 * trip,
    // NTP Server Parameters.
    serverError: 0,
    serverResponseDelay: 0.1 * trip,
  };
}


/** Update the paramter values in the form. */
function drawParameters() {
  var p = parameters;
  CONTROLS.querySelector('input[name="network-trip"]').value            = p.networkTrip;
  CONTROLS.querySelector('input[name="network-asymmetry"]').value       = p.networkAsymmetry;
  CONTROLS.querySelector('input[name="network-trip-variation"]').value  = p.networkTripVariation;
  CONTROLS.querySelector('input[name="simulation-speed"]').value        = p.simulationSpeed;
  CONTROLS.querySelector('input[name="client-offset"]').value           = p.clientOffset;
  CONTROLS.querySelector('input[name="client-drift-rate"]').value       = p.clientDriftRate;
  CONTROLS.querySelector('input[name="client-sync-interval"]').value    = p.clientSyncInterval;
  CONTROLS.querySelector('input[name="client-sync-period"]').value      = p.clientSyncPeriod;
  CONTROLS.querySelector('input[name="client-packet-interval"]').value  = p.clientPacketInterval;
  CONTROLS.querySelector('input[name="server-error"]').value            = p.serverError;
  CONTROLS.querySelector('input[name="server-response-delay"]').value   = p.serverResponseDelay;
}


/** Called when "Adjust Parameters" button is clicked. */
function onAdjustParameters() {
  ADJUST_AUDIO.play();
  adjustParameters();
}


/** Adjust the parameters based on the form input. */
function adjustParameters() {
  var p    = parameters;
  var data = new FormData(CONTROLS);
  formNumber(data, 'network-trip',           x => p.networkTrip           = x);
  formNumber(data, 'network-asymmetry',      x => p.networkAsymmetry      = x);
  formNumber(data, 'network-trip-variation', x => p.networkTripVariation  = x);
  formNumber(data, 'simulation-speed',       x => p.simulationSpeed       = x);
  formNumber(data, 'client-offset',          x => p.clientOffset          = x);
  formNumber(data, 'client-drift-rate',      x => p.clientDriftRate       = x);
  formNumber(data, 'client-sync-interval',   x => p.clientSyncInterval    = x);
  formNumber(data, 'client-sync-period',     x => p.clientSyncPeriod      = x);
  formNumber(data, 'client-packet-interval', x => p.clientPacketInterval  = x);
  formNumber(data, 'server-error',           x => p.serverError           = x);
  formNumber(data, 'server-response-delay',  x => p.serverResponseDelay   = x);
}


/** Process a form number input. */
function formNumber(data, key, fn) {
  var x = parseFloat(data.get(key));
  if (!Number.isNaN(x)) fn(x);
}


/** Called when "Clear Plot" button is clicked. */
function onClearPlot() {
  STOP_AUDIO.play();
  records = [];
  drawPlot();
}


/** Draw the client status. */
function drawClientStatus(ctx) {
  var s = simulation;
  ctx.strokeText(`${Math.round(s.clientTime)} ± ${Math.round(s.clientError)} ms`, 70, 200);
  ctx.strokeText(`${Math.round(s.clientTime - s.time)} ms time offset`, 70, 220);
  ctx.strokeText(`${s.clientSyncs} syncs done`, 70, 240);
  ctx.strokeText(`${s.clientSent} packets sent`, 70, 260);
  ctx.strokeText(`${s.clientRecieved} packets recieved`, 70, 280);
}


/** Draw the server status. */
function drawServerStatus(ctx) {
  var s = simulation;
  var p = parameters;
  ctx.strokeText(`${Math.round(s.time)} ± ${p.serverError} ms`, 955, 200);
  ctx.strokeText(`${s.serverRecieved} packets recieved`, 955, 220);
  ctx.strokeText(`${s.serverSent} packets sent`, 955, 240);
}


/** Draw the packets in the simulation. */
function drawPackets(ctx) {
  var s = simulation;
  for (var m of packets) {
    var isSend    = s.time >= m.clientSendTime && s.time <= m.serverRecieveTime;
    var isRecieve = s.time >= m.serverSendTime && s.time <= m.clientRecieveTime;
    if (isSend) drawSendPacket(ctx, m);
    else if (isRecieve) drawRecievePacket(ctx, m);
  }
}


/** Draw a send packet in the simulation. */
function drawSendPacket(ctx, m) {
  var i = images;
  var s = simulation;
  var x = 80 + 840 * (s.time - m.clientSendTime) / (m.serverRecieveTime - m.clientSendTime);
  ctx.drawImage(i.packet, x, 90, 40, 40);
  ctx.strokeText(`#${m.id}`, x + 15, 90);
}


/** Draw a recieve packet in the simulation. */
function drawRecievePacket(ctx, m) {
  var i = images;
  var s = simulation;
  var x = 920 - 840 * (s.time - m.serverSendTime) / (m.clientRecieveTime - m.serverSendTime);
  ctx.drawImage(i.packet, x, 145, 40, 40);
  ctx.strokeText(`#${m.id}`, x + 15, 200);
}


/** Draw the simulation background. */
function drawBackground(ctx) {
  var i = images;
  ctx.drawImage(i.background, 0, 0, 1024, 320);
}


/** Update buttons based on the current state of the simulation. */
function drawButtons() {
  var s = simulation;
  START_SIMULATION.textContent = !s.isRunning? 'Start Simulation' : s.isPaused? 'Resume Simulation' : 'Pause Simulation';
  STOP_SIMILATION.disabled     = !s.isRunning;
}


/** Draw the plot showing time offset vs round trip time. */
function drawPlot() {
  plot = plot || new Chart(PLOT_OFFSET, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Time Offset',
        data: records,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
      }]
    },
    options: {
      scales: {
        x: {title: {display: true, text: 'Actual Round Trip Time (ms)'}},
        y: {title: {display: true, text: 'Time Offset after Synchronization (ms)'}}
      },
      plugins: {
        datalabels: {
          align: 'end',
          anchor: 'end',
          formatter: (value, context) => `Sync ${value.syncId + 1}`,
        }
      }
    }
  });
  plot.data.datasets[0].data = records;
  plot.update();
}


/** Load images for simulation. */
function loadImages() {
  var i = images;
  i.isLoaded   = true;
  i.background = loadImage(BACKGROUND_IMG);
  i.packet     = loadImage(PACKET_IMG);
}


/** Load an image. */
function loadImage(url) {
  var img = new Image();
  img.src = url;
  return img;
}
