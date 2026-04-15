// composables/useDevConsole.js
import { ref } from 'vue';

export function useDevConsole() {
  const isConsoleOpen = ref(false);
  const appLogs = ref([]);
  let longPressTimer = null;

  const startLongPressTimer = (callback) => {
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      isConsoleOpen.value = true;
      if (callback) callback();
    }, 3000); 
  };

  const cancelLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  const setupConsoleInterceptor = () => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type, args) => {
      const message = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      appLogs.value.push({ type, message, time: new Date().toLocaleTimeString() });
      if (appLogs.value.length > 200) appLogs.value.shift(); 
    };

    console.log = function() { addLog('log', arguments); originalLog.apply(console, arguments); };
    console.warn = function() { addLog('warn', arguments); originalWarn.apply(console, arguments); };
    console.error = function() { addLog('error', arguments); originalError.apply(console, arguments); };
  };

  return { isConsoleOpen, appLogs, startLongPressTimer, cancelLongPress, setupConsoleInterceptor };
}