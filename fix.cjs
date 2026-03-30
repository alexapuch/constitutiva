const fs = require('fs');
let s = fs.readFileSync('src/pages/AdminView.tsx', 'utf8');
s = s.split('\\`').join('`');
s = s.split('\\$').join('$');
fs.writeFileSync('src/pages/AdminView.tsx', s, 'utf8');
