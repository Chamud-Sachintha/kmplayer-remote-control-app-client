import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
} from '@ionic/angular/standalone';
import { NgIf, NgForOf } from '@angular/common';
import { Http } from '@capacitor-community/http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    NgIf,
    NgForOf,
  ],
})
export class HomePage {
  connected = false;
  connectedIp: string | null = null;

  scanning = false;
  foundIps: string[] = [];

  // -------------- Configuration (tune these) --------------
  // If you know typical subnet(s), add them here. E.g. '192.168.1' or '10.0.2'
  subnetBases = ['192.168.1', '192.168.0'];
  port = 5000;

  // speed tuning
  fastTimeoutMs = 600; // fast probe timeout (ms) — smaller => faster but may miss slow hosts
  slowTimeoutMs = 1500; // optional slower retry (not used by default)
  batchSize = 40; // how many parallel probes per batch
  // --------------------------------------------------------

  constructor() {}

  // Fast probe with configurable timeout; returns true if reachable
  private async fastProbe(ip: string, timeoutMs = this.fastTimeoutMs): Promise<boolean> {
    const url = `http://${ip}:${this.port}/`;
    const reqPromise = Http.get({ url, headers: {}, params: {} });

    // timeout wrapper
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs)
    );

    try {
      await Promise.race([reqPromise, timeout]);
      return true;
    } catch {
      return false;
    }
  }

  // Scan a subnet base (e.g., '192.168.1') in batches with prioritization and early exit
  private async scanSubnet(base: string): Promise<string[]> {
    const ips: string[] = [];
    // Build list 1..254
    for (let i = 1; i <= 254; i++) {
      ips.push(`${base}.${i}`);
    }

    // Prioritize likely addresses that often host servers
    const prioritized = [`${base}.1`, `${base}.100`, `${base}.101`, `${base}.50`, `${base}.254`];
    const remaining = ips.filter((ip) => !prioritized.includes(ip));
    const order = [...prioritized, ...remaining];

    const found: string[] = [];

    // Scan in batches
    for (let i = 0; i < order.length; i += this.batchSize) {
      const batch = order.slice(i, i + this.batchSize);

      // Run all probes in the batch in parallel
      const results = await Promise.all(
        batch.map(async (ip) => {
          const ok = await this.fastProbe(ip);
          return { ip, ok };
        })
      );

      // Add found IPs to UI list
      for (const r of results) {
        if (r.ok) {
          // avoid duplicates
          if (!this.foundIps.includes(r.ip)) {
            this.foundIps = [...this.foundIps, r.ip];
          }
          found.push(r.ip);
        }
      }

      // Early exit: if we want to auto-connect to first found, break now
      if (found.length > 0) break;
    }

    return found;
  }

  // Public: scan configured subnets and auto-connect to the first host found
  async scanNetworkAndAutoConnect() {
    if (this.scanning) return;
    this.scanning = true;
    this.foundIps = [];
    this.connected = false;
    this.connectedIp = null;

    try {
      for (const base of this.subnetBases) {
        const found = await this.scanSubnet(base);
        if (found.length > 0) {
          // auto-connect to first discovered host
          await this.autoConnect(found[0]);
          break;
        }
      }

      if (this.foundIps.length === 0) {
        alert('No servers found on port ' + this.port + '. Make sure server is running and your phone is on the same Wi-Fi.');
      }
    } catch (err) {
      console.error('Scan error', err);
      alert('Error occurred while scanning the network.');
    } finally {
      this.scanning = false;
    }
  }

  // Manual connect when tapping a found host in the list
  async autoConnect(ip: string) {
    try {
      await Http.get({ url: `http://${ip}:${this.port}/`, headers: {}, params: {} });
      this.connected = true;
      this.connectedIp = ip;
      alert('Connected to ' + ip);
    } catch (err) {
      console.error('Failed to connect to', ip, err);
      alert('Failed to connect to ' + ip + '.');
    }
  }

  // Send key to connected PC
  async sendKey(key: string) {
    if (!this.connectedIp) {
      alert('Not connected to any PC.');
      return;
    }

    try {
      await Http.post({
        url: `http://${this.connectedIp}:${this.port}/key`,
        headers: { 'Content-Type': 'application/json' },
        data: { key },
        params: {}, // required by the plugin
      });
      console.log('Sent:', key);
    } catch (err) {
      console.error('Error sending key', err);
      alert('Failed to send key to ' + this.connectedIp);
    }
  }

  disconnect() {
    this.connected = false;
    this.connectedIp = null;
  }
}
