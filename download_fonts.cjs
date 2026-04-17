const https = require('https');
const fs = require('fs');

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
};

Promise.all([
    download('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Regular.ttf', 'public/Montserrat-Regular.ttf'),
    download('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Bold.ttf', 'public/Montserrat-Bold.ttf')
]).then(() => console.log('Fonts downloaded'))
  .catch(err => console.error(err));
