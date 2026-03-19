import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-iss-tracker',
    version: '0.1.0',
    icon: '🛰️',
    title: 'ISS Tracker',
    description: 'Track the International Space Station position and trajectory.',
    author: 'Martin Vician',
    repository: 'https://github.com/vician/windy-plugin-iss',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/iss-tracker',
    private: true,
};

export default config;
