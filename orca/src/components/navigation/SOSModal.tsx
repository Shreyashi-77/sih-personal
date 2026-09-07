import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert02Icon, Cancel01Icon, SatelliteIcon, SignalIcon } from '@hugeicons/core-free-icons'

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SOSModal({ isOpen, onClose }: SOSModalProps) {
  const [countdown, setCountdown] = useState(5)
  const [transmitting, setTransmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5)
      setTransmitting(false)
      return
    }

    if (countdown > 0 && !transmitting) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && !transmitting) {
      setTransmitting(true)
    }
  }, [isOpen, countdown, transmitting])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
      
      <div className="absolute top-6 right-6">
        <button 
          onClick={onClose}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={24} />
        </button>
      </div>

      <div className="max-w-md w-full px-6 flex flex-col items-center text-center">
        {/* Pulsing SOS Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-70" />
          <div className="relative w-32 h-32 bg-red-600 rounded-full flex items-center justify-center border-4 border-red-400 shadow-2xl shadow-red-500/50">
            {transmitting ? (
              <HugeiconsIcon icon={SignalIcon} size={56} className="text-white animate-pulse" />
            ) : (
              <HugeiconsIcon icon={Alert02Icon} size={56} className="text-white" />
            )}
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
          {transmitting ? 'Distress Signal Sent' : 'Emergency SOS'}
        </h1>

        <p className="text-red-200 text-lg mb-10 max-w-sm">
          {transmitting 
            ? 'Your coordinates and distress signal have been securely transmitted to the nearest coast guard and registered vessels.' 
            : 'Transmitting emergency distress signal to Indian Coast Guard and nearby vessels in...'}
        </p>

        {!transmitting && (
          <div className="text-7xl font-black text-white tabular-nums drop-shadow-lg mb-10">
            {countdown}
          </div>
        )}

        <button 
          onClick={onClose}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
            transmitting 
              ? 'bg-white text-red-600 hover:bg-gray-100 shadow-xl' 
              : 'bg-red-500/20 text-white border border-red-500 hover:bg-red-500/40'
          }`}
        >
          {transmitting ? 'Return to Navigation' : 'Cancel SOS Transmission'}
        </button>
      </div>

    </div>,
    document.body
  )
}
