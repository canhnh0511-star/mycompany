module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo'], 'nativewind/babel'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            // Khớp tsconfig.json paths ("@/*": "./src/*") — template create-expo-app đặt router/code
            // trong src/, gluestack-ui init mặc định generate alias cho project không có src/, phải sửa
            // lại thủ công kẻo lệch giữa resolve lúc build (babel) và lúc typecheck (tsc).
            '@': './src',
          },
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
