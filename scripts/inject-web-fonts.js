const fs = require('fs');
const path = require('path');

const CUSTOM_CSS = `
    <!-- Google Fonts for Quicksand -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <!-- Material Icons from Google -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style id="custom-fonts">
      /* Map Quicksand font names used by the app */
      @font-face {
        font-family: 'Quicksand_400Regular';
        src: local('Quicksand'), local('Quicksand-Regular');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'Quicksand_500Medium';
        src: local('Quicksand'), local('Quicksand-Medium');
        font-weight: 500;
        font-style: normal;
      }
      @font-face {
        font-family: 'Quicksand_600SemiBold';
        src: local('Quicksand'), local('Quicksand-SemiBold');
        font-weight: 600;
        font-style: normal;
      }
      @font-face {
        font-family: 'Quicksand_700Bold';
        src: local('Quicksand'), local('Quicksand-Bold');
        font-weight: 700;
        font-style: normal;
      }
      /* Feather icons from CDN */
      @font-face {
        font-family: 'Feather';
        src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.0/Fonts/Feather.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: 'feather';
        src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.0/Fonts/Feather.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      /* MaterialCommunityIcons from CDN */
      @font-face {
        font-family: 'MaterialCommunityIcons';
        src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.0/Fonts/MaterialCommunityIcons.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      /* Ionicons from CDN */
      @font-face {
        font-family: 'Ionicons';
        src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.0/Fonts/Ionicons.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      /* FontAwesome from CDN */
      @font-face {
        font-family: 'FontAwesome';
        src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.0/Fonts/FontAwesome.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    </style>`;

const indexPath = path.join(__dirname, '../static-build/web/index.html');

if (!fs.existsSync(indexPath)) {
  console.error('Error: static-build/web/index.html not found');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf-8');

// Check if already injected
if (html.includes('id="custom-fonts"')) {
  console.log('✓ Custom fonts already present in index.html');
  process.exit(0);
}

// Inject after </style> closing tag (before </head>)
html = html.replace('</style>\n  <link rel="icon"', `</style>${CUSTOM_CSS}\n  <link rel="icon"`);

fs.writeFileSync(indexPath, html);
console.log('✓ Injected custom fonts into index.html');
