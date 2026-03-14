export function GamepadHints({ controllerType, mode = 'navigation', visible = true }) {
  if (!visible || !controllerType) return null;
  
  const isPS = controllerType === 'playstation';
  
  const hints = {
    navigation: [
      { key: isPS ? 'cross' : 'a', action: 'Select' },
      { key: isPS ? 'circle' : 'b', action: 'Back' },
      { key: 'dpad', action: 'Navigate' },
      { key: 'tab', action: 'Console Mode' },
    ],
    playback: [
      { key: isPS ? 'cross' : 'a', action: 'Play/Pause' },
      { key: isPS ? 'r1' : 'rb', action: 'Next' },
      { key: isPS ? 'l1' : 'lb', action: 'Prev' },
      { key: isPS ? 'r2' : 'rt', action: 'Vol+' },
      { key: isPS ? 'l2' : 'lt', action: 'Vol-' },
    ],
    console: [
      { key: isPS ? 'cross' : 'a', action: 'Play/Select' },
      { key: isPS ? 'circle' : 'b', action: 'Back' },
      { key: 'dpad', action: 'Navigate' },
    ],
  };

  const keyLabels = {
    playstation: {
      cross: '✕',
      circle: '○',
      square: '□',
      triangle: '△',
      l1: 'L1',
      r1: 'R1',
      l2: 'L2',
      r2: 'R2',
      dpad: 'D-pad',
    },
    xbox: {
      a: 'A',
      b: 'B',
      x: 'X',
      y: 'Y',
      lb: 'LB',
      rb: 'RB',
      lt: 'LT',
      rt: 'RT',
      dpad: 'D-pad',
    },
  };

  const currentHints = hints[mode] || hints.navigation;

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-4 bg-black/90 backdrop-blur-md px-4 sm:px-6 py-2 sm:py-3 rounded-xl z-50 border border-white/10">
      {currentHints.map((hint, i) => (
        <div key={i} className="flex items-center gap-1.5 sm:gap-2 text-gray-200 text-xs sm:text-sm">
          <span className="bg-white/20 px-2 py-0.5 sm:py-1 rounded text-white font-bold min-w-[20px] sm:min-w-[28px] text-center text-xs">
            {hint.key === 'tab' ? 'Tab' : (keyLabels[controllerType]?.[hint.key] || hint.key)}
          </span>
          <span className="text-gray-400 text-xs hidden sm:inline">{hint.action}</span>
        </div>
      ))}
    </div>
  );
}

export function GamepadIndicator({ connected, type }) {
  if (!connected) return null;
  
  const isPS = type === 'playstation';
  
  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full z-50 border border-white/10">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-gray-300 text-xs">
        {isPS ? '🎮 PS' : '🎮 Xbox'}
      </span>
    </div>
  );
}
