/**
 * Ambient type declarations for the client-side PDF stack used by the docs
 * export toolbar. None of these ship their own types, and we only touch a
 * small slice of each API, so these declarations cover just what we use.
 */

declare module 'pdfmake/build/pdfmake' {
  /** A prepared PDF document, produced by {@link PdfMakeStatic.createPdf}. */
  interface TCreatedPdf {
    /** Triggers a browser download of the PDF. */
    download(defaultFileName?: string): Promise<void>;
    /** Resolves with the generated PDF as a Blob. */
    getBlob(): Promise<Blob>;
  }

  /** The pdfmake entry point (browser build). */
  interface PdfMakeStatic {
    /** Registers the virtual filesystem holding the embedded font files. */
    addVirtualFileSystem(vfs: Record<string, string>): void;
    /** Font family definitions (Roboto is provided by default). */
    fonts: Record<string, unknown>;
    /** Builds a PDF from a pdfmake document definition. */
    createPdf(documentDefinition: Record<string, unknown>): TCreatedPdf;
  }

  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  /** Virtual filesystem: font file name → base64-encoded font data. */
  const vfs: Record<string, string>;
  export default vfs;
}

declare module 'html-to-pdfmake' {
  /** Options accepted by html-to-pdfmake. */
  interface HtmlToPdfmakeOptions {
    /** The DOM `window` used to parse the HTML. */
    readonly window?: Window;
    /** Collect images into a reference map instead of inlining them. */
    readonly imagesByReference?: boolean;
    readonly [key: string]: unknown;
  }

  /** Result shape when `imagesByReference` is enabled. */
  interface HtmlToPdfmakeResult {
    /** pdfmake content nodes for the converted HTML. */
    readonly content: unknown[];
    /** Image reference map to pass through to the document definition. */
    readonly images: Record<string, string>;
  }

  function htmlToPdfmake(
    html: string,
    options?: HtmlToPdfmakeOptions,
  ): unknown[] | HtmlToPdfmakeResult;

  export default htmlToPdfmake;
}
