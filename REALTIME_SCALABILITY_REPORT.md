# Realtime Scalability Report & Action Plan: Converse

This report analyzes the horizontal scalability limits of the Converse real-time platform and outlines the technical architecture required to scale to millions of concurrent active connections.

---

## 1. Socket Scaling Bottlenecks & Hardware Limits

On a single server node, WebSockets face strict operating system limits:

1.  **File Descriptors Limit (FD)**: In Unix-like environments, every active TCP/WebSocket connection is treated as a file descriptor. The default limit is often low (1024). This must be raised to support high concurrency:
    ```bash
    ulimit -n 65536
    ```
2.  **Ephemeral Port Exhaustion**: A single IP address can handle a maximum of 65,535 outbound ports when communicating with a single endpoint, limiting outbound API request throughput under high traffic loads.
3.  **RAM Consumption**: Each active socket connection consumes approximately 10 KB to 50 KB of memory inside the Node.js runtime process. A single node with 8 GB of RAM can realistically handle a maximum of 100,000 idle concurrent connections before risking Out-Of-Memory (OOM) crashes.

---

## 2. Horizontal Scaling with Redis Pub/Sub

When scaling Converse horizontally across multiple cloud servers (e.g. AWS EC2 nodes behind an Application Load Balancer), server instances must be synchronized. 

If **User A** is connected to **Server Node 1** and sends a message to **User B** who is connected to **Server Node 2**, Node 1 has no native way to forward that message to Node 2:

```
                  ┌───────────────────────┐
                  │ Application Load Balancer │
                  └───────────┬───────────┘
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
   ┌─────────────────┐                 ┌─────────────────┐
   │  Server Node 1  │                 │  Server Node 2  │
   └────────┬────────┘                 └────────┬────────┘
            │                                   │
       [User A]                            [User B]
```

### The Solution: Redis Pub/Sub Adapter Channel
By introducing Redis as a state sharing backplane, all server nodes subscribe to a centralized Redis cluster. When Node 1 receives an event, it publishes it to the Redis channel. Redis broadcasts the event to all other server nodes, which emit it to their respective connected users:

```
   ┌─────────────────┐                 ┌─────────────────┐
   │  Server Node 1  │                 │  Server Node 2  │
   └────────┬────────┘                 └────────┬────────┘
            │        ▲                 ▲        │
            │        └──── Publish ────┘        │ Forward Event
   [User A] │             Message               │ to User B
    Sends   ▼                                   ▼
   Message  └────────► [ Redis Pub/Sub ] ───────┘
```

This pub/sub adapter pattern decouples server states, enabling true linear horizontal scalability!

---

## 3. High-Throughput Queue Architecture

To prevent heavy operations (such as processing high-resolution image resizing during Onboarding profile saves or transmitting notification email waves) from locking the Node.js event loop, Converse recommends integrating a distributed queue:

```
                  ┌──────────────────────┐
                  │ Express API Gateway  │
                  └──────────┬───────────┘
                             │
                     Enqueue │ (BullMQ / Redis)
                             ▼
                  ┌──────────────────────┐
                  │   Redis Job Queue    │
                  └──────────┬───────────┘
                             │
                     Dequeue │ (Asynchronous)
                             ▼
                  ┌──────────────────────┐
                  │ Worker Server Node   │
                  └──────────┬───────────┘
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │ Image Cropping  │               │ Resend Email    │
   │ & Optimization  │               │ Dispatch Worker │
   └─────────────────┘               └─────────────────┘
```

By offloading blocking computations to BullMQ/Redis worker processes, the core REST/WebSocket server remains responsive, keeping message transport latency low.

---

## 4. High-Scale Database Sharding (MongoDB Atlas)

As transaction volumes grow, single-node database instances degrade. To mitigate database write bottlenecks, the following database sharding strategy is proposed:

*   **Shard Key Selection**: Shard the `FriendRequest` and `Message` collections using **hashed shard keys** (e.g. `{ receiverId: "hashed" }`). This distributes write requests uniformly across the MongoDB cluster, avoiding hot shards.
*   **Write Concerns**: Enforce `{ w: 1, j: true }` write concerns on chat transactions to ensure fast acknowledgments while preserving write durability.
*   **Presence Tracking Offloading**: Never write user "last active" presence updates to MongoDB at high frequencies. Instead, track presence states strictly in Redis using high-speed in-memory strings (`SETEX`), syncing backlogs to MongoDB in batch intervals (every 10 minutes) if necessary.

---

## 5. Media & Asset Delivery Optimization (CDN)

*   **Edge Caching**: Cache all user avatar images and uploaded chat media attachments at global edge locations using **Cloudflare CDN** or **AWS CloudFront**, reducing media request load on the core Express server to 0%.
*   **Asset Processing**: Use a server-side processor like `sharp` inside workers to compress user profile picture uploads down to less than 50 KB, speeding up client download speeds and reducing cloud storage costs.
