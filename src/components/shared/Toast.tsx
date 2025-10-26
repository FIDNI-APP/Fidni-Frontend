/**
 * Toast Component
 *
 * Displays temporary notifications to users
 * Supports different types: info, success, warning, error
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  show: boolean;
}

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        textColor: 'text-green-900'
      };
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
        textColor: 'text-red-900'
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        textColor: 'text-amber-900'
      };
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: <Info className="w-5 h-5 text-blue-600" />,
        textColor: 'text-blue-900'
      };
  }
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  show
}) => {
  useEffect(() => {
    if (!show) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  const styles = getToastStyles(type);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 0 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <div
            className={`${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4 flex items-start gap-3`}
          >
            <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${styles.textColor}`}>{message}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
