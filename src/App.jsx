// src/App.jsx

import React, { useState, useEffect } from 'react';
import Paho from 'paho-mqtt';
import './App.css'; // We'll create this file next

// src/App.jsx

// ... other imports


// ======== CONFIG =========
// Safely import from the .env.local file
const AIO_USERNAME = import.meta.env.VITE_AIO_USERNAME;
const AIO_KEY      = import.meta.env.VITE_AIO_KEY;
const FEED_KEY     = "lock";
// =========================

// hello
// =========================

function App() {
  // State variables to hold dashboard data
  const [mqttStatus, setMqttStatus] = useState('Connecting...');
  const [liveValue, setLiveValue] = useState('—');
  const [restStatus, setRestStatus] = useState('Welcome!');

  const apiUrl = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${FEED_KEY}`;

  // This `useEffect` hook runs once when the component loads.
  // It's the perfect place to establish the MQTT connection.
  useEffect(() => {
    const mqttClient = new Paho.Client("io.adafruit.com", 443, "/mqtt", "web_" + Math.random());

    // Define callback handlers
    mqttClient.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:" + responseObject.errorMessage);
        setMqttStatus('Disconnected');
      }
    };

    mqttClient.onMessageArrived = (message) => {
      console.log("onMessageArrived:" + message.payloadString);
      setLiveValue(message.payloadString);
      setRestStatus('Live value updated via MQTT.');
    };

    // Connect the client
    mqttClient.connect({
      useSSL: true,
      userName: AIO_USERNAME,
      password: AIO_KEY,
      onSuccess: () => {
        console.log("Connected!");
        setMqttStatus('Connected');
        mqttClient.subscribe(`${AIO_USERNAME}/feeds/${FEED_KEY}`);
      },
      onFailure: (responseObject) => {
        console.log("Connection Failed: " + responseObject.errorMessage);
        setMqttStatus('Connection Failed');
      }
    });

    // This is a "cleanup" function that React runs when the component is unmounted
    return () => {
      if (mqttClient.isConnected()) {
        mqttClient.disconnect();
      }
    };
  }, []); // The empty array ensures this effect runs only once

  // --- REST API Functions ---
  const sendREST = async (value) => {
    setRestStatus(`Sending "${value}"...`);
    try {
      const response = await fetch(`${apiUrl}/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AIO-Key": AIO_KEY
        },
        body: JSON.stringify({ value })
      });
      if (response.ok) {
        setRestStatus(`Successfully sent "${value}"!`);
        setLiveValue(value); // Optimistically update the UI
      } else {
        setRestStatus(`Failed to send. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending REST data:", error);
      setRestStatus("Error: Could not reach API.");
    }
  };

  const readREST = async () => {
    setRestStatus("Reading last value...");
    try {
      const response = await fetch(`${apiUrl}/data/last`, {
        headers: { "X-AIO-Key": AIO_KEY }
      });
      if (response.ok) {
        const data = await response.json();
        setRestStatus(`Last value is "${data.value}".`);
        setLiveValue(data.value);
      } else {
        setRestStatus(`Failed to read. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error reading REST data:", error);
      setRestStatus("Error: Could not reach API.");
    }
  };

  // --- Dynamic Class for MQTT Status ---
  const getStatusClass = () => {
    if (mqttStatus === 'Connected') return 'status-connected';
    if (mqttStatus === 'Connecting...') return 'status-connecting';
    return 'status-disconnected';
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>MIT Students UI</h1>
        <p>Adafruit IO Control Panel</p>
      </header>

      <section className="status-section">
        <div className="status-item">
          <span className="status-label">MQTT Status:</span>
          <span className={`status-value ${getStatusClass()}`}>{mqttStatus}</span>
        </div>
        <div className="status-item live-feed">
          <span className="status-label">Live Feed Value:</span>
          <span className="live-value">{liveValue}</span>
        </div>
      </section>

      <section className="controls-section">
        <h2>REST API Controls</h2>
        <div className="button-group">
          <button onClick={() => sendREST('LOCK')} className="btn btn-on">
            Send ON (LOCK)
          </button>
          <button onClick={() => sendREST('UNLOCK')} className="btn btn-off">
            Send OFF (UNLOCK)
          </button>
          <button onClick={readREST} className="btn btn-read">
            Read Last Value
          </button>
        </div>
        <p className="rest-status-message">{restStatus}</p>
      </section>
    </div>
  );
}

export default App;