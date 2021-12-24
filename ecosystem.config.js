module.exports = {
  apps: [{
    name: 'server',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'error',
      PUBLIC_SERVER_URL: 'https://admin.tryion.shop',
      PARSE_SERVER_MOUNT: '/api',
      PARSE_VERIFY_USER_EMAILS: true,
      APP_NAME: 'IonShop',
      APP_ID: 'JrWy7sUKLL',
      MASTER_KEY: 'YOUR_MASTER_KEY',
      READ_ONLY_MASTER_KEY: 'YOUR_READ_ONLY_MASTER_KEY',
      CURRENCY: 'USD',
      CURRENCY_LOCALE: 'en-US',
      CURRENCY_DISPLAY: 'code',
      CUSTOM_LANG: 'en',
      GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',
      PUSH_ANDROID_SENDER_ID: 'YOUR_ANDROID_SENDER_ID',
      PUSH_ANDROID_API_KEY: 'YOUR_ANDROID_API_KEY',
      PUSH_IOS_BUNDLE_ID: 'com.quanlabs.ionshopv2',
      MAILGUN_API_KEY: 'YOUR_MAILGUN_API_KEY',
      MAILGUN_DOMAIN: 'mg.quanlabs.com',
      MAILGUN_FROM_ADDRESS: 'QuanLabs <noreply@quanlabs.com>',
      MAILGUN_HOST: 'api.mailgun.net',
      MAILGUN_PUBLIC_LINK: 'https://www.tryion.shop',
      MAX_REQUEST_SIZE: '20mb',
      DOKKU_LETSENCRYPT_EMAIL: 'dev@quanlabs.com',
      PARSE_DASHBOARD_USER: 'admin',
      PARSE_DASHBOARD_PASS: 'YOUR_ENCRYPTED_PASSWORD',
      PARSE_DASHBOARD_USER_READ_ONLY: 'admin1',
      PARSE_DASHBOARD_PASS_READ_ONLY: 'YOUR_ENCRYPTED_PASSWORD'
    }
  }, {
    name: 'worker',
    script: './worker.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      APP_ID: 'JrWy7sUKLL',
      MASTER_KEY: 'YOUR_MASTER_KEY',
      PUBLIC_SERVER_URL: 'https://admin.tryion.shop',
      PARSE_SERVER_MOUNT: '/api',
    }
  }]
};
