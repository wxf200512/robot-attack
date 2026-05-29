import { useEffect } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, visible, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => onClose(), 1500);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className="bg-black/70 text-white px-4 py-2 rounded-lg text-2xl"
        style={{
          padding: '1rem 2rem',
          maxWidth: '85vw',
          textAlign: 'center',
          wordBreak: 'break-word',
        }}
      >
        {message}
      </div>
    </div>
  );
};

export default Toast;
