const fs = require('fs');
const sharp = require('sharp');

module.exports = function resize(path, format, width, height) {
  const readStream = fs.createReadStream(path);
  let transform = sharp();

  if (format) {
    transform = transform.toFormat(format);
  }

  if (width || height) {
    transform = transform.resize({width: width, height: height, fit: sharp.fit.fill});
  }

  return readStream.pipe(transform);
}