import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import juice from 'juice';
// eslint-disable-next-line import/no-unresolved
import { comb } from 'email-comb';
import signale from 'signale';
import { encodeEmojis } from 'encode-emojis';

// eslint-disable-next-line import/no-unresolved
import specialCharacters from './specialCharacters.js';
// eslint-disable-next-line import/no-unresolved
import { htmlCombConfig, juiceConfig } from './configs.js';

class HTMLUtils {
  static regexLinkHref = /href="([^"]*)"/g;

  static HTMLContentType = 'text/html';

  static pdfContentType = 'application/pdf';

  static streamContentType = 'application/octet-stream';

  static utfMetaTag =
    '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';

  private static handleError(error: unknown | Error): void {
    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }

  static async trimAndCheckHrefLink(
    htmlString: string,
    proxy: string,
  ): Promise<string> {
    const proxyAgent = proxy ? new HttpsProxyAgent(proxy) : undefined;

    const matches = Array.from(htmlString.matchAll(this.regexLinkHref));

    let result = htmlString;

    const checkedLinkList: string[] = [];

    const checkedLInkList = matches.map(async (href) => {
      const url = href[1];
      const trimUrl = url.trim();

      if (url.startsWith('http') && !checkedLinkList.includes(url)) {
        try {
          checkedLinkList.push(trimUrl);

          // eslint-disable-next-line no-await-in-loop
          const response = await fetch(trimUrl, { agent: proxyAgent });
          const { ok, status, statusText } = response;

          const contentType = response.headers.get('content-type');

          if (
            !ok ||
            status !== 200 ||
            !contentType ||
            (!contentType.startsWith(this.HTMLContentType) &&
              !contentType.startsWith(this.pdfContentType) &&
              !contentType.startsWith(this.streamContentType))
          ) {
            throw new Error();
          } else signale.success(url, statusText, status);
        } catch {
          signale.error(`Link unavailable: ${url}`);
        }
      }

      result = result.replace(url, trimUrl);
    });

    await Promise.all(checkedLInkList);

    return result;
  }

  static replaceSpecialCharacters(htmlString: string): string {
    const regexSpecialCharacters = new RegExp(
      Object.keys(specialCharacters).join('|'),
      'g',
    );

    const replaceSpecialCharacters = htmlString.replace(
      regexSpecialCharacters,
      (match) => specialCharacters[match],
    );

    const replaceEmojis = encodeEmojis(replaceSpecialCharacters);

    signale.success('Replace special characters');

    return replaceEmojis;
  }

  static checkMetaTags(htmlString: string) {
    if (!htmlString.includes(this.utfMetaTag)) {
      signale.warn('Meta tag "Content-Type" missing');
    }
  }

  static removeCssLinkTag(htmlString: string, cssFileName: string): string {
    const cssLinkTag = `<link rel="stylesheet" href="${cssFileName}.css" />`;

    return htmlString.replace(cssLinkTag, '');
  }

  static async addInlineCss(
    htmlString: string,
    cssString: string | null,
    cssFileName: string,
  ): Promise<string | void> {
    try {
      let result = htmlString;

      if (cssString) {
        result = this.removeCssLinkTag(result, cssFileName);
        result = juice.inlineContent(result, cssString, juiceConfig);
      } else {
        signale.warn('CSS file not found');

        result = juice(result, juiceConfig);
      }

      signale.success('Inline CSS');

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  static async minifyHtml(
    htmlString: string,
  ): Promise<{ result: string; log: { cleanedLength: number } } | void> {
    try {
      const { result, log } = comb(htmlString, htmlCombConfig);

      signale.success('Minify HTML');

      // this.minifyHtmlLog = log;

      return { result, log };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default HTMLUtils;
