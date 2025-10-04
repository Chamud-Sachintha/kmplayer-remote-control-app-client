import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Http } from '@capacitor-community/http';

@Component({
  selector: 'app-control',
  templateUrl: 'control.page.html',
  styleUrls: ['control.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
})
export class ControlPage {
  port = 5000;
  connectedIp: string | null = localStorage.getItem('connectedIp'); // saved from HomePage

  constructor(private router: Router) {}

  goBack() {
    this.router.navigateByUrl('/');
  }

  async sendCommand(command: string) {
    if (!this.connectedIp) {
      alert('No connected PC found!');
      return;
    }

    try {
      await Http.post({
        url: `http://${this.connectedIp}:${this.port}/key`,
        headers: { 'Content-Type': 'application/json' },
        data: { key: command },
        params: {},
      });
      alert(`Command "${command}" sent!`);
    } catch (err) {
      console.error('Error sending command', err);
      alert('Failed to send command');
    }
  }
}
