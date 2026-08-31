import { NtpExchangeTimestamps } from '../types';

/**
 * Calculates NTP Clock Offset and Round-Trip Delay (RTT) using standard 4-timestamp exchange.
 * 
 * T0: Client sends Ping (Client local time)
 * T1: Server receives Ping (Server local time)
 * T2: Server responds Pong (Server local time)
 * T3: Client receives Pong (Client local time)
 * 
 * Round Trip Time: RTT = (T3 - T0) - (T2 - T1)
 * Clock Offset:    Offset = ((T1 - T0) + (T2 - T3)) / 2
 * 
 * Estimated Master Time on Client = Client_Local_Time + Offset
 */
export function calculateNtpOffset(
  t0_clientSent: number,
  t1_serverReceived: number,
  t2_serverSent: number,
  t3_clientReceived: number
): NtpExchangeTimestamps {
  const roundTripDelay = (t3_clientReceived - t0_clientSent) - (t2_serverSent - t1_serverReceived);
  const clockOffset = ((t1_serverReceived - t0_clientSent) + (t2_serverSent - t3_clientReceived)) / 2;

  return {
    t0_clientSent,
    t1_serverReceived,
    t2_serverSent,
    t3_clientReceived,
    roundTripDelay: Math.max(0, roundTripDelay),
    clockOffset
  };
}

/**
 * Simulates a network ping exchange with latency and jitter.
 */
export function simulateNtpExchange(
  basePingMs: number,
  jitterMs: number,
  trueServerClockDifferenceMs: number = 0
): NtpExchangeTimestamps {
  const outboundLatency = (basePingMs / 2) + ((Math.random() - 0.5) * jitterMs);
  const inboundLatency = (basePingMs / 2) + ((Math.random() - 0.5) * jitterMs);
  const serverProcessingTime = 2 + Math.random() * 3;

  const t0 = performance.now();
  const t1 = t0 + outboundLatency + trueServerClockDifferenceMs;
  const t2 = t1 + serverProcessingTime;
  const t3 = t0 + outboundLatency + serverProcessingTime + inboundLatency;

  return calculateNtpOffset(t0, t1, t2, t3);
}

export interface SyncScheduleCommand {
  type: 'SCHEDULE_PLAY' | 'PAUSE' | 'SEEK' | 'PREPARE';
  targetPositionMs: number;
  scheduledMasterTimeMs: number;
  videoUri?: string;
  orientation?: string;
  totalDevices?: number;
}

/**
 * BroadcastChannel helper for cross-tab multi-window synchronization.
 */
export class VideoWallBroadcastBus {
  private channel: BroadcastChannel | null = null;
  private channelName = 'android_video_wall_sync_bus';

  constructor(onMessage?: (data: any) => void) {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        if (onMessage) {
          this.channel.onmessage = (event) => onMessage(event.data);
        }
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }
  }

  public broadcast(data: any) {
    if (this.channel) {
      try {
        this.channel.postMessage(data);
      } catch (e) {
        console.warn('Failed to broadcast message', e);
      }
    }
  }

  public close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
