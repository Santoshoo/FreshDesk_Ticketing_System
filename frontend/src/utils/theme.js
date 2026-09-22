export function getSavedTheme() {
  return localStorage.getItem('kims_theme') || 'light';
}

export function applyTheme(theme) {
  const selectedTheme = theme || getSavedTheme();
  if (selectedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (selectedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

export function setTheme(theme) {
  localStorage.setItem('kims_theme', theme);
  applyTheme(theme);
}

// Initial theme application
if (typeof window !== 'undefined') {
  applyTheme();
  
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getSavedTheme() === 'system') {
        applyTheme('system');
      }
    });
  }
}
