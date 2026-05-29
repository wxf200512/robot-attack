import './devMock';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeFBInstant } from './FBLoader';

initializeFBInstant({
  onComplete: () => {
    console.log('FBInstant 加载完成，渲染 React 应用...');
    ReactDOM.createRoot(document.getElementById('root-container')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  },
}).catch((error) => {
  console.error('FBInstant 初始化失败:', error);
});
