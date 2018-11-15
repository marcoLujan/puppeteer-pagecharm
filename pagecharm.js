#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fileUrl = require('file-url');


const EOL = '\n';
// const fileUrl = require('file-url');

const argsDef = [
  { name: 'file', alias: 'f', type: String,  description: 'File pathname to navigate file to. The url could include scheme, e.g. https://\n', defaultOption: true },
  { name: 'url',      alias: 'u', type: String,  description: 'URL to navigate page to. The url should include scheme, e.g. https://\n' },
  { name: 'output',   alias: 'o', type: String,  description: 'The file path to save the image to. If path is a relative path, then it is resolved relative to current working directory. If no path is provided, the image won\'t be saved to the disk.\n' },
  { name: 'type',     alias: 't', type: String,  description: 'Specify screenshot type, can be either jpeg or png. \n{italic Default: png}\n' },

  { name: 'selector', alias: 's', type: String,  description: 'A CSS selector of an element to wait for. \n{italic Default: body}\n' },
  { name: 'width',    alias: 'w', type: Number,  description: 'Viewport width in pixels \n{italic Default: 800}\n' },
  { name: 'height',   alias: 'h', type: Number,  description: 'Viewport height in pixels \n{italic Default: 600}\n' },
  { name: 'timeout',              type: Number,  description: 'Maximum time to wait for in milliseconds. \n{italic Default: 30000}\n' },

  { name: 'quality',  alias: 'q', type: Number,  description: 'The quality of the image, between 0-100. Not applicable to png images.\n' },
  { name: 'fullPage',             type: Boolean, description: 'When true, takes a screenshot of the full scrollable page. \n{italic Defaults: false}\n' },

  { name: 'format',               type: String,  description: 'Letter, A4 .... \n{italic Defaults: Letter}\n' },
  { name: 'noheadless',           type: Boolean, description: 'Allow disabling headless mode. \n{italic Default: false}\n'},
  { name: 'nosandbox',            type: Boolean, description: 'Allow disabling the sandbox and SUID sandbox. \n{italic Default: false}\n'},
  { name: 'help',     alias: '?', type: Boolean, description: 'This help\n' },
];

const args  = require('command-line-args')(argsDef);
const usage = require('command-line-usage')(
    {
        header: 'Options',
        optionList: argsDef
    }
);


const makeCapture = async function ({
    file,
    url,
    output,
    type,

    selector = 'body',
    width = 1200,
    height = 600,

    /* Only for screenshots */
    quality,
    fullPage = false,

    /* Only for PDFs */
    format = 'Letter',
    marginTop = '6.25mm',
    marginRight = '6.25mm',
    marginLeft = '6.25mm',
    marginBottom = '14.11mm',

    /* System */
    noheadless,
    nosandbox = false,
    timeout = 30000,
}) {
  const browser = await puppeteer.launch({
      headless: !noheadless,
      args:['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(timeout);

  try {
    await page.setViewport({ width, height });

    await page.goto(url || fileUrl(file), {
        waitUntil: [ 'load', 'networkidle0' ]
    });

    await page.waitForSelector(selector, { visible: true, timeout });

    output = output === '-' ? undefined : output;
    type = type === 'jpg' ? 'jpeg' : type;


    let result = undefined;
    if (type === 'pdf') {
        result = await page.pdf({
            path: output,
            format: format,
            //~ printBackground: argv.background,
            margin: {
                top: marginTop,
                right: marginRight,
                bottom: marginBottom,
                left: marginLeft
            }
        });
    } else {
        result = await page.screenshot({
            path: output,
            type,
            quality,
            fullPage,
            clip: !fullPage && await (await page.$(selector)).boundingBox(),
        });
    }

    if (!output) {
        process.stdout.write(result);
    }

  } catch (error) {
        await browser.close();
        process.exitCode = 1;
        throw error;
  }

  await browser.close();
};

if (args.help || (!args.url && !args.file)) {
    !args.help && process.stderr.write('No url or file provided.' + EOL);
    process.stderr.write(usage);
    process.exitCode = 1;
} else {
    makeCapture(args);
}
