import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import parse from 'csv-parser';
import archiver from 'archiver';

const csvFilePath = './src/links.csv';  // path to csv file
const outputFolder = './output/output_pdfs';  // output path
const zipFilePath = './output/outputPDFs.zip';  // compressed output path
const backgroundImagePath = './src/public/assets/QR_BG_image.jpg';  // background image path

const readCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const links = [];
    fs.createReadStream(filePath)
      .pipe(parse())
      .on('data', (row) => links.push(row))
      .on('end', () => resolve(links))
      .on('error', (error) => reject(error));
  });
};

const imageToBase64 = (filePath) => {
  return `data:image/${path.extname(filePath).slice(1)};base64,${fs.readFileSync(filePath).toString('base64')}`;
};

const imageIdExtractor = (url) => {
  const parts = url.split('/')
  const fileName = parts[parts.length - 1]

  const extractId = fileName.split('.')[0]

  return `skin_analyzer_${extractId}.pdf`
}

const generatePDFs = async () => {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width: 3508, height: 2480 });

  // Add User-Agent to avoid being blocked
  // await page.setExtraHTTPHeaders({
  //   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
  // });

  const backgroundBase64 = imageToBase64(backgroundImagePath);
  const links = await readCSV(csvFilePath);

  for (let i = 0; i < links.length; i++) {
    const key = Object.keys(links[i])[0];
    const qr_code_link = links[i][key];
    console.log(`Processing link ${i + 1}: ${qr_code_link}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated PDF</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <div class="relative w-full h-[2480px]">
          <img class="w-full h-full object-cover" src="${backgroundBase64}" />
          <img class="absolute bottom-[4.2%] left-[36.5%] w-[18.5%]" src="${qr_code_link}" />
        </div>
      </body>
      </html>
    `;

    try {
      await page.setContent(htmlContent, { waitUntil: 'load' });

      // Wait for images to load
      await page.waitForSelector('img');
      // await delay(2000); // Extra wait time

      const pdfPath = path.join(outputFolder, `${imageIdExtractor(qr_code_link)  || `skin_analyzer_${i + 1}.pdf`}`);
      await page.pdf({
        path: pdfPath,
        printBackground: true,
        width: '3508px',
        height: '2480px',
        preferCSSPageSize: false
      });
      console.log(`Generated PDF: ${pdfPath}`);
    } catch (error) {
      console.error(`Failed to process link ${i + 1}: ${qr_code_link}`, error);
    }
  }

  await browser.close();

  console.log('Creating ZIP file...');
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = fs.createWriteStream(zipFilePath);

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`ZIP file created: ${zipFilePath}`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(outputFolder, false);
    archive.finalize();
  });
};

generatePDFs()
  .then(() => console.log('All PDFs processed and zipped.'))
  .catch((error) => console.error('Error:', error));
