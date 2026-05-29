import React from 'react';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  message?: string;
  spinnerColor?: string;
  backgroundColor?: string;
  textColor?: string;
  showProgress?: boolean;
  progress?: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  spinnerColor = '#ffffff',
  backgroundColor = 'rgba(50, 50, 50, 0.8)',
  textColor = '#ffffff',
  showProgress = false,
  progress = 0,
}) => {
  return (
    <div className="loading-overlay" style={{ backgroundColor }}>
      <div className="loading-content">
        <div
          className="loading-spinner"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderTopColor: spinnerColor,
          }}
        />
        <div className="loading-message" style={{ color: textColor }}>
          {message}
        </div>

        {showProgress && (
          <div className="loading-progress-container">
            <div
              className="loading-progress-bar"
              style={{ width: `${progress}%`, backgroundColor: spinnerColor }}
            />
            <div className="loading-progress-text" style={{ color: textColor }}>
              {progress}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
