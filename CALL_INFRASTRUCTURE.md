# Call & Media Infrastructure: Converse

This document defines the WebRTC Peer Connection architecture, media stream capture flow, and safety teardown mechanisms implemented in Converse to provide HD, low-latency audio/video calling.

---

## 1. Selective Forwarding Unit (SFU) Architecture

Converse uses GetStream.io's WebRTC infrastructure, which operates on a **Selective Forwarding Unit (SFU)** model. 

Unlike traditional mesh-based P2P networks—where each client must upload a separate media stream to every other participant—each Converse client opens exactly **one** secure WebRTC Peer Connection to the Stream SFU:

```
        [Client A]                   [Client B]
            │                            │
      Media │ (1 Upload)           Media │ (1 Upload)
            ▼                            ▼
  ┌──────────────────────────────────────────────────┐
  │                   Stream SFU                     │
  │                                                  │
  │   - Receives video/audio streams from each peer  │
  │   - Dynamically scales quality based on network  │
  │   - Forwards streams to respective recipients   │
  └──────────────────────────────────────────────────┘
            │                            │
      Media │ (1 Download)         Media │ (1 Download)
            ▼                            ▼
        [Client B]                   [Client A]
```

### Advantages of SFU over Mesh P2P
*   **Minimal Client Bandwidth**: Upload bandwidth remains constant even as participant counts grow, preventing mobile battery drain and packet drop stuttering.
*   **Dynamic Resolution Scaling**: The SFU dynamically reduces incoming resolution if a client's downlink network degrades, preventing freezing or crashes.

---

## 2. Dynamic WebRTC Lifecycle and Active Stream Cleanup

WebRTC requires explicit release of hardware devices (camera & microphone) and peer connections. 

If a component unmounts without proper teardown, the browser will leave the camera/mic in an active state (indicated by the persistent green recording icon on browser tabs), creating a severe resource leak and privacy concern.

### The Standard Media Leak Vulnerability
In initial calling scaffolds, exiting a call page did not trigger teardowns. The peer connections and media streams remained active.

### The Converse Hardened Teardown Solution
Converse implements a strict cleanup contract inside `CallPage.jsx`'s mounting hooks:

```javascript
useEffect(() => {
  let callInstance = null;
  let videoClient = null;
  let active = true;

  const initCall = async () => {
    ...
    videoClient = new StreamVideoClient({ apiKey, user, token });
    callInstance = videoClient.call("default", callId);
    await callInstance.join({ create: true });

    // Guard: If unmounted while async setup was negotiating, abort immediately!
    if (!active) {
      callInstance.leave().catch(console.error);
      videoClient.disconnectUser().catch(console.error);
      return;
    }
    ...
  };

  initCall();

  // Teardown trigger on unmount
  return () => {
    active = false;
    console.log("Cleaning up CallPage: Leaving call and disconnecting client...");
    if (callInstance) {
      callInstance.leave().catch(err => 
        console.error("Error leaving call on unmount:", err)
      );
    }
    if (videoClient) {
      videoClient.disconnectUser().catch(err => 
        console.error("Error disconnecting Stream video client on unmount:", err)
      );
    }
  };
}, [tokenData, authUser, callId]);
```

### What this Teardown Accomplishes
1.  **Releases Hardware Devices**: Calling `callInstance.leave()` immediately instructs the browser to close all media tracks, extinguishing the tab's camera/mic recording light.
2.  **Destroys Peer Connections**: Shuts down active RTCPeerConnections on both the client and SFU, freeing system file descriptors and sockets.
3.  **Tears Down WebSockets**: `videoClient.disconnectUser()` ends WebSocket signaling, releasing background thread resources.

---

## 3. Realtime WebRTC Call States

GetStream's SDK handles media state transitions inside `CallPage`. The stream moves through the following stages:

| State | Renders | Action Trigger |
| :--- | :--- | :--- |
| `CallingState.JOINING` | Loading Screen | Client creating connection, offering SDP, and negotiating ice candidates. |
| `CallingState.JOINED` | Interactive Layout | Connection established. Capturing and displaying media tracks. |
| `CallingState.RECONNECTING` | Overlay Banner | Connection lost. Negotiating alternative ICE candidates without dropping call. |
| `CallingState.LEFT` | Redirect to Home | Peer connection closed. Redirects client to `/`. |

---

## 4. Quality of Service (QoS) & Network Adaptation

*   **Dynamic Bandwidth Management**: If network quality drops, the client automatically scales down video capture resolution from 720p to 360p or audio-only to preserve call connectivity.
*   **ICE Restart**: If the client switches networks (e.g. Wi-Fi to cellular) during a call, the SDK automatically executes an *ICE Restart*, re-negotiating media routing seamlessly without disconnecting the user.
