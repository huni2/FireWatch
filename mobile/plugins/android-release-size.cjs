const { withGradleProperties } = require('expo/config-plugins');

function properties(profile = 'preview') {
  return {
    // Keep both phone ABIs; production AAB can include emulator ABIs too.
    reactNativeArchitectures: profile === 'development' || profile === 'production'
      ? 'armeabi-v7a,arm64-v8a,x86,x86_64' : 'armeabi-v7a,arm64-v8a',
    'android.enableMinifyInReleaseBuilds': 'true',
    'android.enableShrinkResourcesInReleaseBuilds': 'true',
  };
}

module.exports = config => withGradleProperties(config, next => {
  const values = properties(process.env.EAS_BUILD_PROFILE || process.env.FIREWATCH_ANDROID_PROFILE || 'preview');
  const keys = new Set(Object.keys(values));
  next.modResults = next.modResults.filter(item => item.type !== 'property' || !keys.has(item.key));
  next.modResults.push(...Object.entries(values).map(([key, value]) => ({ type: 'property', key, value })));
  return next;
});
module.exports.properties = properties;
