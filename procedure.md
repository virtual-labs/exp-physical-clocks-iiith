### Procedure

This simulation demonstrates clock synchronization in distributed systems. Users can explore how various network conditions and parameters affect synchronization accuracy.

**Note**: Use **landscape mode** on mobile devices for optimal viewing.

---

### Getting Started

1. **Load the Simulation**: Open the Simulation tab in your browser
2. **Select a Scenario**: Choose from predefined network configurations:
   - Local Area Network (LAN) - clean, noisy, or asymmetric
   - Metropolitan Area Network (MAN) - noisy or asymmetric
   - Wide Area Network (WAN) - noisy or asymmetric
   - Globally Distributed Network - noisy or asymmetric
   - Custom - configure your own parameters

3. **Run Basic Simulation**:
   - Click **Start Simulation** to begin
   - Observe the client and server clocks
   - Introduce client clock skew and watch the divergence
   - Click **Synchronize Now** to trigger synchronization
   - Observe how Cristian's algorithm corrects the client's clock

---

### Simulation Controls

#### Action Buttons
- **Start/Stop Simulation**: Begin or halt the simulation
- **Synchronize Now**: Force immediate synchronization (may send multiple packets)
- **Send Packet**: Manually add a packet to improve synchronization accuracy
- **Clear Plot**: Reset the round-trip time vs. synchronization error graph

#### Key Parameters

**Network Configuration**
- **Round trip time (ms)**: Total packet travel time between client and server
- **Round trip time variation (ms)**: Network jitter simulation
- **Round trip time asymmetry variation (ms)**: Difference between forward/return path delays
- **Simulation speed (ms/s)**: Rate at which simulation time progresses

**Client Settings**
- **Initial time offset (ms)**: Starting clock difference from server
- **Drift rate (ppm)**: Clock drift in parts per million
- **Synchronization interval (ms)**: Time between sync attempts
- **Synchronization period (ms)**: Duration of each sync session
- **Synchronization packet interval (ms)**: Time between packets during sync

**Server Settings**
- **Time error (ms)**: Server's clock error relative to actual time
- **Response delay (ms)**: Server processing delay before responding

---

### Experimental Steps

Modify parameters individually and observe their effects on the synchronization graph:

**1. Network Delay Effects**
   - Adjust **Round trip time**: Observe how longer delays increase synchronization uncertainty
   - Modify **Round trip time variation**: See how jitter affects accuracy and predictability

**2. Network Asymmetry Impact**
   - Increase **Round trip time asymmetry variation**: Note greater offset calculation discrepancies
   - Compare symmetric vs. asymmetric scenarios

**3. Client Clock Behavior**
   - Set different **Initial time offset** values: Watch correction over multiple sync attempts
   - Increase **Drift rate**: Observe the need for more frequent synchronization

**4. Synchronization Strategy**
   - Adjust **Synchronization interval** and **period**: Balance accuracy vs. network load
   - Modify **Synchronization packet interval**: See how multiple measurements improve accuracy

**5. Server Performance**
   - Change **Server response delay**: Observe increased synchronization uncertainty
   - Combine with network delays to simulate real-world conditions

**6. Combined Scenarios**
   - Test multiple parameters simultaneously to understand complex interactions
   - Compare results across different predefined scenarios

---

### Understanding the Results

The plot displays round-trip time versus synchronization error, helping visualize:
- How network conditions affect accuracy
- The effectiveness of multiple packet exchanges
- Trade-offs between synchronization frequency and precision
- Impact of asymmetric network paths on clock offset calculations
