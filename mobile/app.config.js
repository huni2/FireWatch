const fs = require('node:fs');
const path = require('node:path');

// EAS file variable points to a temporary file on the builder.
// Local Firebase config is deliberately excluded from source control.
module.exports = ({ config }) => {
  const servicesFile = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
  return {
    ...config,
    android: {
      ...config.android,
      ...(fs.existsSync(path.resolve(__dirname, servicesFile))
        ? { googleServicesFile: servicesFile }
        : {}),
    },
  };
};
