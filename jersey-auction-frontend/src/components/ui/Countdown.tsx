import React, { useState, useEffect } from 'react';

interface CountdownProps {
  endTime: string;
  onEnd?: () => void;
  compact?: boolean;
}

export const Countdown: React.FC<CountdownProps> = ({ endTime, onEnd, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isEnded: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false });

  useEffect(() => {
    let didNotifyEnd = false;

    const calculateTime = () => {
      const difference = +new Date(endTime) - +new Date();
      
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true });
        if (!didNotifyEnd) {
          didNotifyEnd = true;
          if (onEnd) onEnd();
        }
        return true; // is ended
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isEnded: false
      });
      return false;
    };

    const isEndedInitial = calculateTime();
    if (isEndedInitial) return;

    const interval = setInterval(() => {
      if (calculateTime()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onEnd]);

  if (timeLeft.isEnded) {
    return (
      <span className="text-brand-accent-red font-bold uppercase tracking-wider">
        Auction Ended
      </span>
    );
  }

  const formatNum = (num: number) => String(num).padStart(2, '0');
  const totalSeconds = (timeLeft.days * 86400) + (timeLeft.hours * 3600) + (timeLeft.minutes * 60) + timeLeft.seconds;
  const isUrgent = totalSeconds <= 300;
  const isCritical = totalSeconds <= 60;
  const toneClass = isCritical ? 'text-brand-accent-red' : isUrgent ? 'text-amber-400' : 'text-brand-gold';
  const borderClass = isCritical ? 'border-brand-accent-red/45' : isUrgent ? 'border-amber-400/35' : 'border-slate-800';
  const digitBoxClass = `bg-brand-navy border ${borderClass} ${toneClass} px-3 py-1.5 rounded-lg font-mono font-bold text-lg min-w-[38px] text-center shadow-inner ${
    isUrgent ? 'animate-countdown-urgent' : ''
  }`;
  const separatorClass = `${toneClass} font-bold mb-5 ${isUrgent ? 'animate-countdown-urgent' : ''}`;

  if (compact) {
    return (
      <span className={`font-mono font-bold ${toneClass} ${isUrgent ? 'animate-countdown-urgent' : ''}`}>
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {formatNum(timeLeft.hours)}:{formatNum(timeLeft.minutes)}:{formatNum(timeLeft.seconds)}
      </span>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <div className={digitBoxClass}>
            {formatNum(timeLeft.days)}
          </div>
          <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Days</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <div className={digitBoxClass}>
          {formatNum(timeLeft.hours)}
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Hrs</span>
      </div>
      <span className={separatorClass}>:</span>
      <div className="flex flex-col items-center">
        <div className={digitBoxClass}>
          {formatNum(timeLeft.minutes)}
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Mins</span>
      </div>
      <span className={separatorClass}>:</span>
      <div className="flex flex-col items-center">
        <div className={digitBoxClass}>
          {formatNum(timeLeft.seconds)}
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Secs</span>
      </div>
    </div>
  );
};
export default Countdown;
