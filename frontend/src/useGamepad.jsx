import { useState, useEffect, useCallback, useRef } from 'react';

const BUTTON_MAPPINGS = {
  playstation: {
    cross: 0,
    circle: 1,
    square: 2,
    triangle: 3,
    l1: 4,
    r1: 5,
    l2: 6,
    r2: 7,
    share: 8,
    options: 9,
    l3: 10,
    r3: 11,
    dpadUp: 12,
    dpadDown: 13,
    dpadLeft: 14,
    dpadRight: 15,
  },
  xbox: {
    a: 0,
    b: 1,
    x: 2,
    y: 3,
    lb: 4,
    rb: 5,
    lt: 6,
    rt: 7,
    back: 8,
    start: 9,
    l3: 10,
    r3: 11,
    dpadUp: 12,
    dpadDown: 13,
    dpadLeft: 14,
    dpadRight: 15,
  },
};

const detectControllerType = (gamepad) => {
  const id = gamepad.id.toLowerCase();
  if (id.includes('playstation') || id.includes('ps4') || id.includes('ps5') || id.includes('dualshock') || id.includes('dualsense') || id.includes('sony') || id.includes('054c')) {
    return 'playstation';
  }
  if (id.includes('xbox') || id.includes('microsoft') || id.includes('045e') || id.includes('xbox') || id.includes('controller') && !id.includes('054c') && !id.includes('playstation') && !id.includes('dualshock') && !id.includes('dualsense')) {
    return 'xbox';
  }
  return null;
};

export function useGamepad(handlers) {
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [controllerType, setControllerType] = useState(null);
  const pressedButtons = useRef(new Set());
  const animationFrameRef = useRef(null);
  const lastButtonTime = useRef({});
  const lastAxisMove = useRef({});
  const axisThreshold = 0.5;

  const {
    onNavigate,
    onSelect,
    onBack,
    onPlayPause,
    onNext,
    onPrev,
    onVolumeUp,
    onVolumeDown,
    onSearch,
  } = handlers || {};

  const isButtonPressed = useCallback((buttonIndex) => {
    return pressedButtons.current.has(buttonIndex);
  }, []);

  const handleButtonDown = useCallback((buttonIndex) => {
    const now = Date.now();
    const lastTime = lastButtonTime.current[buttonIndex] || 0;
    
    if (now - lastTime < 150) return;
    lastButtonTime.current[buttonIndex] = now;

    const mapping = BUTTON_MAPPINGS[controllerType];
    
    if (buttonIndex === mapping.dpadUp) {
      onNavigate?.('up');
    } else if (buttonIndex === mapping.dpadDown) {
      onNavigate?.('down');
    } else if (buttonIndex === mapping.dpadLeft) {
      onNavigate?.('left');
    } else if (buttonIndex === mapping.dpadRight) {
      onNavigate?.('right');
    } else if (buttonIndex === mapping.cross || buttonIndex === mapping.a) {
      onSelect?.();
    } else if (buttonIndex === mapping.circle || buttonIndex === mapping.b) {
      onBack?.();
    } else if (buttonIndex === mapping.square || buttonIndex === mapping.x) {
      onPlayPause?.();
    } else if (buttonIndex === mapping.r1 || buttonIndex === mapping.rb) {
      onNext?.();
    } else if (buttonIndex === mapping.l1 || buttonIndex === mapping.lb) {
      onPrev?.();
    } else if (buttonIndex === mapping.r2 || buttonIndex === mapping.rt) {
      onVolumeUp?.();
    } else if (buttonIndex === mapping.l2 || buttonIndex === mapping.lt) {
      onVolumeDown?.();
    }
  }, [controllerType, onNavigate, onSelect, onBack, onPlayPause, onNext, onPrev, onVolumeUp, onVolumeDown]);

  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0];
    
    if (gamepad) {
      if (!gamepadConnected) {
        setGamepadConnected(true);
        const detected = detectControllerType(gamepad);
        if (detected) {
          setControllerType(detected);
        } else {
          setControllerType('playstation');
        }
      }

      gamepad.buttons.forEach((button, index) => {
        if (button.pressed) {
          if (!pressedButtons.current.has(index)) {
            pressedButtons.current.add(index);
            handleButtonDown(index);
          }
        } else {
          pressedButtons.current.delete(index);
        }
      });

      if (gamepad.axes && gamepad.axes.length >= 4) {
        const now = Date.now();
        const axes = [gamepad.axes[0], gamepad.axes[1], gamepad.axes[2], gamepad.axes[3]];
        
        if (Math.abs(axes[0]) > axisThreshold || Math.abs(axes[1]) > axisThreshold) {
          const lastMove = lastAxisMove.current[0] || 0;
          if (now - lastMove > 150) {
            if (axes[1] < -axisThreshold) {
              onNavigate?.('up');
              lastAxisMove.current[0] = now;
            } else if (axes[1] > axisThreshold) {
              onNavigate?.('down');
              lastAxisMove.current[0] = now;
            } else if (axes[0] < -axisThreshold) {
              onNavigate?.('left');
              lastAxisMove.current[0] = now;
            } else if (axes[0] > axisThreshold) {
              onNavigate?.('right');
              lastAxisMove.current[0] = now;
            }
          }
        }

        if (Math.abs(axes[2]) > axisThreshold || Math.abs(axes[3]) > axisThreshold) {
          const lastMove = lastAxisMove.current[1] || 0;
          if (now - lastMove > 150) {
            if (axes[3] < -axisThreshold) {
              onNavigate?.('up');
              lastAxisMove.current[1] = now;
            } else if (axes[3] > axisThreshold) {
              onNavigate?.('down');
              lastAxisMove.current[1] = now;
            } else if (axes[2] < -axisThreshold) {
              onNavigate?.('left');
              lastAxisMove.current[1] = now;
            } else if (axes[2] > axisThreshold) {
              onNavigate?.('right');
              lastAxisMove.current[1] = now;
            }
          }
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(pollGamepad);
  }, [gamepadConnected, handleButtonDown, onNavigate]);

  useEffect(() => {
    const handleConnection = (e) => {
      setGamepadConnected(true);
      setControllerType(detectControllerType(e.gamepad));
    };

    const handleDisconnection = () => {
      setGamepadConnected(false);
      pressedButtons.current.clear();
    };

    window.addEventListener('gamepadconnected', handleConnection);
    window.addEventListener('gamepaddisconnected', handleDisconnection);

    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
      setGamepadConnected(true);
      const detected = detectControllerType(gamepads[0]);
      setControllerType(detected || 'playstation');
    }

    animationFrameRef.current = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnection);
      window.removeEventListener('gamepaddisconnected', handleDisconnection);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pollGamepad]);

  return { gamepadConnected, controllerType };
}
