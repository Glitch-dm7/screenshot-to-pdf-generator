# QR Code Generator with Custom Background

This project generates QR codes with a customizable background using HTML and Puppeteer. You can easily modify the QR code's data and background image by adjusting a CSV file and the UI.

## Steps to Set Up and Use

### 1. Install Dependencies
First, install the required dependencies by running the following command in your project directory:

```bash
npm install
```

### 2. Modify CSV path
Update the CSV file path in ```src/utils/screenshot.js``` to point to your data file.

### 3. Adjust the UI
Modify the UI elements as needed in ```src/public/index.html``` to customize the appearance of the page and then change the html content inside ```src/utils/screenshot.js```.