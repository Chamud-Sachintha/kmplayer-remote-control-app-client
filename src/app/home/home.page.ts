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
import { RouterLink } from '@angular/router';
import { Network } from '@capacitor/network';

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
    RouterLink
  ],
})
export class HomePage {
  connected = false;
  connectedIp: string | null = null;

  scanning = false;
  foundIps: string[] = [];

  port = 5000;

  // speed tuning
  fastTimeoutMs = 300; // Android-friendly fast probe
  concurrency = 60; // number of parallel probes

  subnetBases: string[] = []; // will detect dynamically

  constructor() {}

  async ngOnInit() {
  // On Android, Network.getStatus() does not provide IP address
  // So we use hardcoded common local subnets
  this.subnetBases = ['192.168.1', '192.168.0'];

  // Optionally, you can log network status for debug
  try {
    const status = await Network.getStatus();
    console.log('Network connected:', status.connected);
    console.log('Connection type:', status.connectionType);
  } catch (err) {
    console.warn('Unable to get network status:', err);
  }
}

  private async fastProbe(ip: string, timeoutMs = this.fastTimeoutMs): Promise<boolean> {
    const url = `http://${ip}:${this.port}/`;
    const reqPromise = Http.get({ url, headers: {}, params: {} });

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

  private async scanSubnet(base: string): Promise<string[]> {
    const ips = Array.from({ length: 254 }, (_, i) => `${base}.${i + 1}`);
    const prioritized = [`${base}.1`, `${base}.100`, `${base}.101`, `${base}.50`, `${base}.254`];
    const remaining = ips.filter(ip => !prioritized.includes(ip));
    const order = [...prioritized, ...remaining];

    const found: string[] = [];
    let index = 0;

    const worker = async () => {
      while (index < order.length) {
        const ip = order[index++];
        const ok = await this.fastProbe(ip);
        if (ok) found.push(ip);
      }
    };

    const workers = Array.from({ length: this.concurrency }, () => worker());
    await Promise.all(workers);

    // Update UI once
    this.foundIps = [...this.foundIps, ...found];
    return found;
  }

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

  async autoConnect(ip: string) {
    try {
      await Http.get({ url: `http://${ip}:${this.port}/`, headers: {}, params: {} });
      this.connected = true;
      this.connectedIp = ip;
      localStorage.setItem('connectedIp', ip);
      alert('Connected to ' + ip);
    } catch (err) {
      console.error('Failed to connect to', ip, err);
      alert('Failed to connect to ' + ip + '.');
    }
  }

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
        params: {},
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
