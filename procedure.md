This experimental procedure outlines how to use the provided simulation to understand Network Time Protocol (NTP) concepts. In the simulation, we explore the effects on time synchronization between a client and a server in a number of scenarios. These include:
- Local Area Network (LAN)
- Local Area Network (noisy)
- Local Area Network (asymmetric)
- Metropolitan Area Network (noisy)
- Metropolitan Area Network (asymmetric)
- Wide Area Network (noisy)
- Wide Area Network (asymmetric)
- Globally Distributed Network (noisy)
- Globally Distributed Network (asymmetric)
- Custom

Each scenario can be customized by adjusting various parameters. The goal is to observe how different factors influence the accuracy and reliability of time synchronization in a networked environment. A figure plotting the actual round-trip time versus the time synchronization error is displayed to visualize the synchronization process.


### Simulation Controls

#### Buttons

- **Start Simulation**: Begin the simulation with the selected parameters.
- **Stop Simulation**: Halt the simulation in progress.
- **Synchronize Now**: Force an immediate synchronization between the client and server (multiple packets may be exchanged to achieve synchronization).
- **Send Packet**: Add a packet to the current synchronization process manually. This may help improve the synchronization accuracy.
- **Adjust Parameters**: Modify the network and client parameters to observe their effects on synchronization.
- **Clear Plot**: Reset the current plot of round-trip time versus synchronization error.


#### Network and Simulation Parameters

- **Round trip time (ms)**: The time taken for a packet to travel from the client to the server and back, in milliseconds.
- **Round trip time variation (ms)**: The variation in the round trip time, simulating network jitter, in milliseconds.
- **Round trip time asymmetry variation (ms)**: The variation in difference of forward and return trip times, simulating network asymmetry, in milliseconds.
- **Simulation speed (ms/s)**: The speed at which the simulation progresses, in milliseconds per second.


#### NTP Client Parameters

- **Initial time offset of the client (ms)**: The initial offset of the client's clock relative to the server's clock, in milliseconds.
- **Drift rate of the client (ppm)**: The rate at which the client's clock drifts from the server's clock, in parts per million.
- **Synchronization interval (ms)**: The time interval between synchronization attempts by the client, in milliseconds.
- **Synchronization period (ms)**: The duration for which the client synchronizes with the server, in milliseconds.
- **Synchronization packet interval (ms)**: The time interval between packets sent during synchronization, in milliseconds.


#### NTP Server Parameters

- **Time error of the server (ms)**: The error in the server's clock relative to the actual time, in milliseconds.
- **Delay at server before responding to a request (ms)**: The delay introduced by the server before responding to a client request, in milliseconds.


#### Experimental Steps

1. **Load the Simulation Page**
   - Open the Simulation tab in your browser to access the simulation interface.

2. **Select a Scenario**
   - Choose a scenario from the dropdown menu to simulate different network configurations.
   - The scenarios range from local networks to globally distributed networks with varying levels of noise and asymmetry.

3. **Adjust Parameters and Observe Effects**
   Use the control form to modify the following parameters individually and observe their effects on synchronization. The provided figure will help visualize the changes.

   **Network Trip Time**
   - Increase/decrease "Round trip time" to simulate longer or shorter network trip times.
   - **Observation**: Longer trip times may result in greater uncertainty in the time synchronization process.

   **Network Asymmetry**
   - Adjust "Round trip time asymmetry variation" to introduce unequal delays in the forward and return paths.
   - **Observation**: Higher asymmetry may result in greater discrepancies in calculated offsets.

   **Network Trip Variation**
   - Change "Round trip time variation" to simulate varying network jitter.
   - **Observation**: Greater variation can make synchronization less predictable and accurate.

   **Client Offset**
   - Set different values for "Initial time offset of the client" to observe the impact of initial clock differences.
   - **Observation**: Initial offsets should be corrected over multiple synchronization attempts.

   **Client Drift Rate**
   - Modify "Drift rate of the client" to simulate clock drift in the client.
   - **Observation**: Higher drift rates necessitate more frequent synchronization to maintain accuracy.

   **Client Sync Interval and Period**
   - Adjust "Synchronization interval" and "Synchronization period" to control the synchronization frequency and duration.
   - **Observation**: More frequent synchronization can mitigate the effects of clock drift but may increase network load.

   **Server Response Delay**
   - Change "Delay at server before responding to a request" to simulate server response delays.
   - **Observation**: Higher response delays can increase the uncertainty in synchronization.
