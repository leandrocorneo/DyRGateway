export default function ThemeScript() {
  const code = `
(function () {
  try {
    var stored = localStorage.getItem('dyr-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (_) {}
})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
