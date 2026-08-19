import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tactile.kyotogoods',
  appName: 'Kyoto Goods Sort',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#F3EFEA'
  }
};

export default config;
