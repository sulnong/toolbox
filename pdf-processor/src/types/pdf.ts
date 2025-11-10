/**
 * PDF文档信息
 */
export interface PDFDocument {
  pages: PDFPage[];
  metadata: PDFMetadata;
  fileInfo: FileInfo;
}

/**
 * PDF页面信息
 */
export interface PDFPage {
  pageNumber: number;
  size: {
    width: number;
    height: number;
  };
  rotation: number;
  text?: string;
  images?: PDFImage[];
  annotations?: PDFAnnotation[];
  content?: PDFContent[];
}

/**
 * PDF元数据
 */
export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  version: string;
  isEncrypted: boolean;
  hasPassword: boolean;
}

/**
 * 文件信息
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number; // 字节
  format: string;
  encoding?: string;
}

/**
 * PDF图像信息
 */
export interface PDFImage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  format: string;
  data?: Buffer;
  altText?: string;
}

/**
 * PDF注释信息
 */
export interface PDFAnnotation {
  id: string;
  type: 'text' | 'highlight' | 'underline' | 'strikeout' | 'link' | 'note';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  author?: string;
  creationDate?: Date;
}

/**
 * PDF内容信息
 */
export interface PDFContent {
  type: 'text' | 'image' | 'table' | 'form';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content: string | any;
  style?: {
    font?: string;
    size?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
  };
}

/**
 * PDF转换选项
 */
export interface ConversionOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0-100
  dpi?: number; // 默认300
  width?: number;
  height?: number;
  pages?: number[]; // 指定页码，不指定则转换所有页面
  singleFile?: boolean; // 是否合并到单个文件
}

/**
 * PDF修改选项
 */
export interface ModificationOptions {
  addWatermark?: WatermarkOptions;
  addAnnotations?: AnnotationOptions[];
  removeAnnotations?: boolean;
  rotatePages?: PageRotation[];
  mergePDFs?: string[];
  splitPages?: number[] | string; // 页码或 'all'
  password?: PasswordOptions;
}

/**
 * 水印选项
 */
export interface WatermarkOptions {
  type: 'text' | 'image';
  content: string | Buffer;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
  opacity?: number; // 0-1
  size?: number;
  color?: string;
  rotation?: number;
  x?: number;
  y?: number;
  pages?: number[]; // 应用于哪些页面
}

/**
 * 注释选项
 */
export interface AnnotationOptions {
  type: 'text' | 'highlight' | 'underline' | 'strikeout';
  content: string;
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  font?: string;
  fontSize?: number;
}

/**
 * 页面旋转选项
 */
export interface PageRotation {
  pageNumber: number;
  rotation: 0 | 90 | 180 | 270;
}

/**
 * 密码选项
 */
export interface PasswordOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    copying?: boolean;
    modifying?: boolean;
    annotating?: boolean;
  };
}
