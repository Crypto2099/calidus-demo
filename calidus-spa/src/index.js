import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css'
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <MantineProvider>
    <Notifications />
    <App />
  </MantineProvider>
);
