import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonFab,
  IonFabButton,
  IonIcon,
  IonLabel,
  IonRange,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Http } from '@capacitor-community/http';

@Component({
  selector: 'app-control',
  templateUrl: 'control.page.html',
  styleUrls: ['control.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton, IonIcon, IonLabel, IonRange, FormsModule],
})
export class ControlPage {
  port = 5000;
  brightness = 50;
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

  async onBrightnessChange(event: any) {
    const value = event.detail.value;
    this.brightness = value;

    try {
      await Http.post({
        url: `http://${this.connectedIp}:5000/brightness`,
        headers: { 'Content-Type': 'application/json' },
        data: { value },
        params: {},
      });
    } catch (err) {
      console.error('Error adjusting brightness:', err);
    }
  }
}
