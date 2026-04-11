import { reactive, watch } from 'vue';

// Default settings
const defaultSettings = {
  bgColor: '#1e1e1e',
  textColor: '#e0e0e0',
  accentColor: '#42b883', // Vue Green
  fontFamily: 'sans-serif',
  fontSize: '16px'
};

const theme = reactive({ ...defaultSettings });

export function useTheme() {
  
  // Function to apply styles to the document root
  const applyTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', theme.bgColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--font-size', theme.fontSize);
  };

  // Watch for changes and apply immediately (reactivity)
  watch(theme, applyTheme, { immediate: true });

  return {
    theme
  };
}