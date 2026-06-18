import React, { useState, useEffect } from 'react';

interface InteractiveEyeProps {
  emailLength: number;
  passwordLength: number;
  confirmPasswordLength?: number;
  focusedField: 'email' | 'password' | 'confirmPassword' | 'otp' | null;
  isPasswordVisible: boolean;
}

export const InteractiveEye: React.FC<InteractiveEyeProps> = ({
  emailLength,
  passwordLength,
  confirmPasswordLength = 0,
  focusedField,
  isPasswordVisible,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Blink logic
  useEffect(() => {
    const isClosedState =
      (focusedField === 'password' || focusedField === 'confirmPassword') &&
      !isPasswordVisible;

    if (isClosedState) return;

    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [focusedField, isPasswordVisible]);

  const isClosed =
    (focusedField === 'password' || focusedField === 'confirmPassword') &&
    !isPasswordVisible;

  // Eyelid vertical radius (closed = 0, blinking = 1, open = 16)
  let eyelidRy = 16;
  if (isClosed) {
    eyelidRy = 0;
  } else if (isBlinking) {
    eyelidRy = 1;
  }

  // Calculate pupil displacement (dx, dy)
  let dx = 0;
  let dy = 0;

  if (focusedField === 'email') {
    dy = 4;
    const ratio = Math.min(emailLength, 30) / 30;
    dx = -6 + ratio * 12; // tracks email text
  } else if (focusedField === 'password') {
    if (isPasswordVisible) {
      dy = 5;
      const ratio = Math.min(passwordLength, 20) / 20;
      dx = -6 + ratio * 12; // tracks visible password text
    } else {
      dx = 0;
      dy = 0;
    }
  } else if (focusedField === 'confirmPassword') {
    if (isPasswordVisible) {
      dy = 5;
      const ratio = Math.min(confirmPasswordLength, 20) / 20;
      dx = -6 + ratio * 12;
    } else {
      dx = 0;
      dy = 0;
    }
  } else if (focusedField === 'otp') {
    dy = 5;
  }

  // Antenna LED color
  let ledColor = '#0ea5e9'; // sky-500 (idle blue)
  if (focusedField === 'email') {
    ledColor = '#003d9b'; // theme dark blue
  } else if (focusedField === 'password' || focusedField === 'confirmPassword') {
    ledColor = isPasswordVisible ? '#22c55e' : '#f59e0b'; // green (watching) vs amber (hidden/secure)
  } else if (focusedField === 'otp') {
    ledColor = '#8b5cf6'; // purple (otp)
  }

  // Pupil and shine coordinates
  const leftPupilX = 55 + dx;
  const leftPupilY = 52 + dy;
  const rightPupilX = 105 + dx;
  const rightPupilY = 52 + dy;

  return (
    <div className="w-28 h-22 mx-auto select-none pointer-events-none drop-shadow-md">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 160 120"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f0f9ff" />
          </linearGradient>
          <clipPath id="left-eye-clip">
            <ellipse cx="55" cy="52" rx="16" ry={eyelidRy} />
          </clipPath>
          <clipPath id="right-eye-clip">
            <ellipse cx="105" cy="52" rx="16" ry={eyelidRy} />
          </clipPath>
        </defs>

        {/* Antenna */}
        <line
          x1="80"
          y1="16"
          x2="80"
          y2="6"
          stroke="#003d9b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="80"
          cy="5"
          r="4.5"
          fill={ledColor}
          className="transition-colors duration-300"
        />
        <circle
          cx="80"
          cy="5"
          r="7"
          fill={ledColor}
          fillOpacity="0.3"
          className="transition-colors duration-300 animate-pulse"
        />

        {/* Ears */}
        <rect
          x="12"
          y="42"
          width="8"
          height="18"
          rx="4"
          fill="#003d9b"
        />
        <rect
          x="140"
          y="42"
          width="8"
          height="18"
          rx="4"
          fill="#003d9b"
        />

        {/* Robot Head */}
        <rect
          x="18"
          y="15"
          width="124"
          height="85"
          rx="32"
          fill="url(#headGrad)"
          stroke="#003d9b"
          strokeWidth="2.5"
        />

        {/* Visor */}
        <rect
          x="28"
          y="27"
          width="104"
          height="50"
          rx="22"
          fill="#0f172a"
          stroke="#e2e8f0"
          strokeWidth="1"
        />

        {/* Left Eye */}
        <g clipPath="url(#left-eye-clip)">
          <circle cx="55" cy="52" r="16" fill="#ffffff" />
          {/* Pupil */}
          <circle
            cx={leftPupilX}
            cy={leftPupilY}
            r="7.5"
            fill="#003d9b"
            className="transition-all duration-100 ease-out"
          />
          {/* Shine */}
          <circle
            cx={leftPupilX - 2.5}
            cy={leftPupilY - 2.5}
            r="2"
            fill="#ffffff"
            className="transition-all duration-100 ease-out"
          />
        </g>

        {/* Right Eye */}
        <g clipPath="url(#right-eye-clip)">
          <circle cx="105" cy="52" r="16" fill="#ffffff" />
          {/* Pupil */}
          <circle
            cx={rightPupilX}
            cy={rightPupilY}
            r="7.5"
            fill="#003d9b"
            className="transition-all duration-100 ease-out"
          />
          {/* Shine */}
          <circle
            cx={rightPupilX - 2.5}
            cy={rightPupilY - 2.5}
            r="2"
            fill="#ffffff"
            className="transition-all duration-100 ease-out"
          />
        </g>

        {/* Closed Eyes Curves (show when password hidden) */}
        {isClosed && (
          <>
            <path
              d="M 43,53 Q 55,61 67,53"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 93,53 Q 105,61 117,53"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Mouth */}
        {isClosed ? (
          // Shy "o" mouth
          <circle
            cx="80"
            cy="84"
            r="3"
            fill="none"
            stroke="#003d9b"
            strokeWidth="2"
          />
        ) : (focusedField === 'password' || focusedField === 'confirmPassword') && isPasswordVisible ? (
          // Happy excited mouth when looking at visible password
          <path
            d="M 74,83 Q 80,91 86,83 Z"
            fill="#ef4444"
            stroke="#003d9b"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : (
          // Normal smile
          <path
            d="M 74,83 Q 80,88 86,83"
            fill="none"
            stroke="#003d9b"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Hands / Paws */}
        <g
          style={{
            transform: `translateY(${isClosed ? '-38px' : '30px'})`,
          }}
          className="transition-transform duration-300 ease-out"
        >
          {/* Left Hand */}
          <rect
            x="40"
            y="85"
            width="30"
            height="45"
            rx="15"
            fill="#003d9b"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <circle cx="55" cy="95" r="4" fill="#ffffff" opacity="0.3" />

          {/* Right Hand */}
          <rect
            x="90"
            y="85"
            width="30"
            height="45"
            rx="15"
            fill="#003d9b"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <circle cx="105" cy="95" r="4" fill="#ffffff" opacity="0.3" />
        </g>
      </svg>
    </div>
  );
};
